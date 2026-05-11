import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

// GET - Bilet etkinliği detayı
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { admin, error } = await requirePermission(req, 'canAccessTickets');
    if (error) return error;

    const { id } = await params;

    const event = await prisma.ticketEvent.findUnique({
      where: { id },
      include: {
        sponsor: true,
        prizes: {
          orderBy: { order: "asc" },
          include: {
            winners: {
              include: {
                ticketNumber: {
                  include: {
                    user: {
                      select: {
                        siteUsername: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        requests: {
          include: {
            ticketNumbers: true,
          },
        },
        ticketNumbers: {
          orderBy: { ticketNumber: "asc" },
          include: {
            request: {
              include: {
                user: {
                  select: {
                    siteUsername: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Bilet etkinliği bulunamadı" },
        { status: 404 }
      );
    }

    // Kullanıcı bazında bilet sayılarını hesapla
    const userTicketCounts = await prisma.ticketNumber.groupBy({
      by: ['userId'],
      where: { eventId: id },
      _count: { id: true },
    });

    // Her kullanıcı için detaylı bilgi çek
    const userDetails = await Promise.all(
      userTicketCounts.map(async (uc) => {
        const user = await prisma.user.findUnique({
          where: { id: uc.userId },
          select: {
            siteUsername: true,
            email: true,
          },
        });

        // Bu kullanıcının bu etkinlik için yaptığı talepleri bul
        const requests = await prisma.ticketRequest.findMany({
          where: {
            eventId: id,
            userId: uc.userId,
            status: 'approved',
          },
          select: {
            sponsorInfo: true,
          },
        });

        // Bu kullanıcının tüm bilet numaralarını al
        const userTicketNumbers = await prisma.ticketNumber.findMany({
          where: {
            eventId: id,
            userId: uc.userId,
          },
          select: {
            ticketNumber: true,
          },
          orderBy: {
            ticketNumber: 'asc',
          },
        });

        return {
          userId: uc.userId,
          siteUsername: user?.siteUsername,
          email: user?.email,
          ticketCount: uc._count.id,
          sponsorInfo: requests[0]?.sponsorInfo || 'N/A',
          ticketNumbers: userTicketNumbers.map(tn => tn.ticketNumber),
        };
      })
    );

    // Toplam istatistikler
    const approvedRequests = event.requests.filter(r => r.status === 'approved');
    const totalInvestment = approvedRequests.reduce((sum, r) => sum + r.investmentAmount, 0);

    // Format ticket numbers with user info
    const formattedTicketNumbers = event.ticketNumbers.map(tn => ({
      id: tn.id,
      ticketNumber: tn.ticketNumber,
      userId: tn.userId,
      username: tn.request?.user?.siteUsername || tn.request?.user?.email || 'N/A',
      sponsorInfo: tn.request?.sponsorInfo || 'N/A',
    }));

    return NextResponse.json({
      event,
      userTicketCounts: userDetails,
      ticketNumbers: formattedTicketNumbers,
      stats: {
        totalInvestment,
        totalParticipants: userDetails.length,
      },
    });
  } catch (error) {
    console.error("Bilet etkinliği detay hatası:", error);
    return NextResponse.json(
      { error: "Bilet etkinliği getirilemedi" },
      { status: 500 }
    );
  }
}

// DELETE - Bilet etkinliğini sil
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { admin, error } = await requirePermission(req, 'canAccessTickets');
    if (error) return error;

    const { id } = await params;

    await prisma.ticketEvent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bilet etkinliği silme hatası:", error);
    return NextResponse.json(
      { error: "Bilet etkinliği silinemedi" },
      { status: 500 }
    );
  }
}
