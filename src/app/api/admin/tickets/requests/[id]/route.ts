import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram/core";
import { getTurkeyDate, formatDateTR } from "@/lib/utils";
import { z } from "zod";

type Params = {
  params: Promise<{ id: string }>;
};

// PUT - Bilet talebini onayla/reddet
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { admin, error } = await requirePermission(req, 'canAccessTickets');
    if (error) return error;

    const { id } = await params;

    const schema = z.object({
      action: z.enum(["approve", "reject"]),
      rejectionReason: z.string().optional(),
    });

    const body = await req.json();
    const data = schema.parse(body);

    const request = await prisma.ticketRequest.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            sponsor: true,
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Bilet talebi bulunamadı" },
        { status: 404 }
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "Bu talep zaten işlendi" },
        { status: 400 }
      );
    }

    if (data.action === "approve") {
      // Yatırım tutarını bilet fiyatına böl
      const requestedTicketCount = Math.floor(request.investmentAmount / request.event.ticketPrice);

      if (requestedTicketCount < 1) {
        return NextResponse.json(
          { error: "Yatırım tutarı bilet almak için yetersiz" },
          { status: 400 }
        );
      }

      // Kalan bilet sayısını kontrol et
      const remainingTickets = request.event.totalTickets - request.event.soldTickets;

      if (remainingTickets < 1) {
        return NextResponse.json(
          { error: "Etkinlikte hiç bilet kalmadı" },
          { status: 400 }
        );
      }

      // Kalan bilet sayısından fazla verilemez - kalan bilet kadar ver
      const ticketCount = Math.min(requestedTicketCount, remainingTickets);
      const isPartialApproval = ticketCount < requestedTicketCount;

      // Mevcut maksimum bilet numarasını bul
      const maxTicket = await prisma.ticketNumber.findFirst({
        where: { eventId: request.eventId },
        orderBy: { ticketNumber: "desc" },
      });

      const startNumber = (maxTicket?.ticketNumber || 0) + 1;

      // Bilet numaralarını oluştur
      const ticketNumbers: Array<{
        eventId: string;
        requestId: string;
        userId: string;
        ticketNumber: number;
      }> = [];
      for (let i = 0; i < ticketCount; i++) {
        ticketNumbers.push({
          eventId: request.eventId,
          requestId: request.id,
          userId: request.userId,
          ticketNumber: startNumber + i,
        });
      }

      // Transaction ile güncelleme
      const result = await prisma.$transaction(async (tx) => {
        // Bilet numaralarını oluştur
        await tx.ticketNumber.createMany({
          data: ticketNumbers,
        });

        // Talebi onayla
        const updatedRequest = await tx.ticketRequest.update({
          where: { id },
          data: {
            status: "approved",
            processedBy: admin.username,
            processedAt: getTurkeyDate(),
          },
        });

        // Etkinliğin satılan bilet sayısını güncelle
        const newSoldCount = request.event.soldTickets + ticketCount;
        const updateData: any = {
          soldTickets: newSoldCount,
        };

        // Eğer biletler doluyorsa, otomatik olarak waiting_draw durumuna geçir
        if (newSoldCount >= request.event.totalTickets) {
          updateData.status = "waiting_draw";
        }

        await tx.ticketEvent.update({
          where: { id: request.eventId },
          data: updateData,
        });

        return updatedRequest;
      });

      // Kullanıcıya bildirim gönder
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
      });

      if (user?.telegramId) {
        // Kullanıcının bu etkinlikteki toplam bilet sayısı
        const totalUserTickets = await prisma.ticketNumber.count({
          where: {
            eventId: request.eventId,
            userId: request.userId,
          },
        });

        const ticketNumbersList = ticketNumbers.map(t => t.ticketNumber).join(', ');
        const requestDate = formatDateTR(request.createdAt);

        let message = `✅ Bilet Talebiniz Onaylandı!\n\n📌 Etkinlik: ${request.event.title}\n📅 Talep Tarihi: ${requestDate}\n💰 Yatırım Tutarı: ${request.investmentAmount} TL`;

        if (isPartialApproval) {
          message += `\n\n⚠️ Kısmi Onay: Etkinlikte sadece ${ticketNumbers.length} bilet kaldığı için bu kadar bilet verildi.`;
        }

        message += `\n🎟️ Onaylanan Bilet Sayısı: ${ticketNumbers.length}\n🔢 Bilet Numaralarınız: ${ticketNumbersList}\n\n📊 Toplam Biletiniz: ${totalUserTickets}`;

        await sendTelegramMessage(Number(user.telegramId), message);
      }

      return NextResponse.json({
        success: true,
        request: result,
        ticketCount,
        requestedTicketCount,
        isPartialApproval,
        remainingTickets,
        ticketNumbers: ticketNumbers.map(t => t.ticketNumber),
      });
    } else {
      // Reddet
      const updatedRequest = await prisma.ticketRequest.update({
        where: { id },
        data: {
          status: "rejected",
          processedBy: admin.username,
          processedAt: getTurkeyDate(),
          rejectionReason: data.rejectionReason,
        },
      });

      // Kullanıcıya bildirim gönder
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
      });

      if (user?.telegramId) {
        const requestDate = formatDateTR(request.createdAt);
        const investmentDate = formatDateTR(request.investmentDate);
        const formattedAmount = request.investmentAmount.toLocaleString('tr-TR');
        const estimatedTickets = Math.floor(request.investmentAmount / request.event.ticketPrice);

        let message = `❌ Bilet Talebiniz Reddedildi\n\n📌 Etkinlik: ${request.event.title}\n💼 Sponsor: ${request.event.sponsor.name}\n💰 Yatırım Tutarı: ${formattedAmount} TL\n🎟️ Talep Edilen Bilet: ~${estimatedTickets} adet\n📅 Yatırım Tarihi: ${investmentDate}\n📅 Talep Tarihi: ${requestDate}`;

        if (data.rejectionReason) {
          message += `\n\n📝 Red Nedeni: ${data.rejectionReason}`;
        }

        await sendTelegramMessage(Number(user.telegramId), message);
      }

      return NextResponse.json({
        success: true,
        request: updatedRequest,
      });
    }
  } catch (error) {
    console.error("Bilet talebi işleme hatası:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Bilet talebi işlenemedi" },
      { status: 500 }
    );
  }
}
