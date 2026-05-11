import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTurkeyDate } from "@/lib/utils";
import { z } from "zod";
import { logTicketRequest, extractRequestInfo } from "@/lib/services/activity-log-service";

// POST - Bilet talebi oluştur
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    // Kullanıcıyı kontrol et
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, telegramId: true, emailVerified: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    // Telegram ve email doğrulama kontrolü
    if (!user.telegramId || !user.emailVerified) {
      return NextResponse.json(
        {
          error: 'Bilet talep etmek için Telegram bağlantısı ve email doğrulaması gereklidir',
          requiresVerification: true,
          needsTelegram: !user.telegramId,
          needsEmail: !user.emailVerified
        },
        { status: 403 }
      );
    }

    const schema = z.object({
      eventId: z.string().min(1, "Etkinlik ID gerekli"),
      sponsorInfo: z.string().min(1, "Sponsor bilgisi gerekli"),
      investmentAmount: z.number().min(1, "Yatırım tutarı 0'dan büyük olmalı"),
      investmentDate: z.string().min(1, "Yatırım tarihi gerekli"),
      note: z.string().optional(),
    });

    const body = await req.json();
    const data = schema.parse(body);

    // Etkinliği kontrol et
    const event = await prisma.ticketEvent.findUnique({
      where: { id: data.eventId },
      include: {
        sponsor: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Bilet etkinliği bulunamadı" },
        { status: 404 }
      );
    }

    if (event.status !== "active") {
      return NextResponse.json(
        { error: "Bu etkinlik artık aktif değil" },
        { status: 400 }
      );
    }

    if (new Date(event.endDate) < new Date()) {
      return NextResponse.json(
        { error: "Bu etkinliğin süresi dolmuş" },
        { status: 400 }
      );
    }

    // Kullanıcının sponsor bilgisini kontrol et
    const sponsorInfo = await prisma.userSponsorInfo.findUnique({
      where: {
        userId_sponsorId: {
          userId: session.userId,
          sponsorId: event.sponsorId,
        },
      },
    });

    if (!sponsorInfo) {
      return NextResponse.json(
        { error: "Önce sponsor bilgilerinizi kaydetmelisiniz" },
        { status: 400 }
      );
    }

    // Bilet talebi oluştur
    // investmentDate Türkiye saati (GMT+3) olarak geldiği için timezone bilgisini ekle
    // Format: "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DDTHH:mm:00+03:00"
    let investmentDateWithTZ = data.investmentDate;
    if (!investmentDateWithTZ.includes('+') && !investmentDateWithTZ.includes('Z')) {
      // Saniye yoksa ekle
      if (investmentDateWithTZ.split(':').length === 2) {
        investmentDateWithTZ += ':00';
      }
      // Türkiye timezone'unu ekle (GMT+3)
      investmentDateWithTZ += '+03:00';
    }

    const ticketRequest = await prisma.ticketRequest.create({
      data: {
        eventId: data.eventId,
        userId: session.userId,
        sponsorInfo: data.sponsorInfo,
        investmentAmount: data.investmentAmount,
        investmentDate: new Date(investmentDateWithTZ),
        note: data.note || null,
      },
      include: {
        event: {
          include: {
            sponsor: true,
          },
        },
      },
    });

    // Activity log
    const requestInfo = extractRequestInfo(req);
    await logTicketRequest(
      session.userId,
      ticketRequest.id,
      event.title,
      data.sponsorInfo,
      data.investmentAmount,
      requestInfo
    );

    return NextResponse.json({ request: ticketRequest }, { status: 201 });
  } catch (error) {
    console.error("Bilet talebi oluşturma hatası:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Bilet talebi oluşturulamadı" },
      { status: 500 }
    );
  }
}
