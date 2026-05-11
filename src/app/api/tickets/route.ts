import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTurkeyDate } from "@/lib/utils";

// GET - Aktif bilet etkinliklerini listele (herkes görebilir)
export async function GET(req: NextRequest) {
  try {
    // Login gerektirmez - herkes aktif biletleri görebilir
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'active';
    const eventId = searchParams.get('eventId');

    // Eğer eventId varsa, sadece o etkinliği getir
    if (eventId) {
      const event = await prisma.ticketEvent.findUnique({
        where: { id: eventId },
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
          _count: {
            select: {
              ticketNumbers: true,
            },
          },
        },
      });

      if (!event) {
        return NextResponse.json({ events: [] });
      }

      // waiting_draw durumundaki etkinlikler için benzersiz kullanıcı sayısını hesapla
      let eventWithStats = event;
      if (event.status === 'waiting_draw') {
        const uniqueUsers = await prisma.ticketNumber.groupBy({
          by: ['userId'],
          where: {
            eventId: event.id,
          },
        });

        eventWithStats = {
          ...event,
          uniqueParticipants: uniqueUsers.length,
        } as typeof event & { uniqueParticipants: number };
      }

      return NextResponse.json({ events: [eventWithStats] });
    }

    // "active" status sorgusu sadece "active" durumundakileri getirmeli
    const statusCondition = { status: status };

    const events = await prisma.ticketEvent.findMany({
      where: {
        ...statusCondition,
        ...(status === 'active' ? {
          endDate: {
            gte: new Date(),
          },
        } : {}),
      },
      include: {
        sponsor: true,
        prizes: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            ticketNumbers: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // ✅ OPTIMIZE: waiting_draw durumundaki etkinlikler için benzersiz kullanıcı sayısını tek sorguda hesapla
    const waitingDrawEvents = events.filter(e => e.status === 'waiting_draw');
    const waitingDrawEventIds = waitingDrawEvents.map(e => e.id);

    // Tek sorguda tüm waiting_draw event'lerin unique user count'larını al
    let uniqueUserCounts: Record<string, number> = {};
    if (waitingDrawEventIds.length > 0) {
      const uniqueUsers = await prisma.ticketNumber.groupBy({
        by: ['eventId', 'userId'],
        where: {
          eventId: { in: waitingDrawEventIds }
        }
      });

      // Event ID'ye göre grupla ve say
      uniqueUserCounts = uniqueUsers.reduce((acc, item) => {
        acc[item.eventId] = (acc[item.eventId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }

    // Events'e unique participant count'ları ekle
    const eventsWithStats = events.map(event => {
      if (event.status === 'waiting_draw') {
        return {
          ...event,
          uniqueParticipants: uniqueUserCounts[event.id] || 0,
        } as typeof event & { uniqueParticipants: number };
      }
      return event;
    });

    return NextResponse.json({ events: eventsWithStats });
  } catch (error) {
    console.error("Bilet etkinlikleri listeleme hatası:", error);
    return NextResponse.json(
      { error: "Bilet etkinlikleri listelenemedi" },
      { status: 500 }
    );
  }
}
