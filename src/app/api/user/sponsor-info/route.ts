import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { invalidateCache, enhancedCache, CacheKeys } from "@/lib/enhanced-cache";
import { logSponsorInfoChange, extractRequestInfo } from "@/lib/services/activity-log-service";

// Tüm sponsor bilgilerini getir
export async function GET(request: NextRequest) {
  try {
    // Session kontrolü - artık query parametresi yerine session kullanıyoruz
    const session = await requireAuth(request);
    const userId = session.userId;

    const sponsorInfos = await prisma.userSponsorInfo.findMany({
      where: { userId },
      include: {
        sponsor: {
          select: {
            id: true,
            name: true,
            identifierType: true,
            logoUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ sponsorInfos });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }
    console.error("Sponsor bilgileri getirme hatası:", error);
    return NextResponse.json(
      { error: "Sponsor bilgileri getirilemedi" },
      { status: 500 }
    );
  }
}

// Sponsor bilgisi kaydet/güncelle
export async function POST(request: NextRequest) {
  try {
    // Session kontrolü - artık query parametresi yerine session kullanıyoruz
    const session = await requireAuth(request);
    const userId = session.userId;

    const { sponsorId, identifier } = await request.json();

    if (!sponsorId || !identifier) {
      return NextResponse.json(
        { error: "Sponsor ve bilgi gereklidir" },
        { status: 400 }
      );
    }

    // Identifier'ı trim et
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier) {
      return NextResponse.json(
        { error: "Bilgi boş olamaz" },
        { status: 400 }
      );
    }

    // Sponsor var mı kontrol et
    const sponsor = await prisma.sponsor.findUnique({
      where: { id: sponsorId },
    });

    if (!sponsor) {
      return NextResponse.json(
        { error: "Sponsor bulunamadı" },
        { status: 404 }
      );
    }

    // Identifier tipine göre validasyon
    if (sponsor.identifierType === "id") {
      // ID ise sadece sayı kabul et
      if (!/^\d+$/.test(trimmedIdentifier)) {
        return NextResponse.json(
          { error: "ID sadece sayılardan oluşmalıdır" },
          { status: 400 }
        );
      }
    } else if (sponsor.identifierType === "email") {
      // Email ise email formatı kontrol et
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedIdentifier)) {
        return NextResponse.json(
          { error: "Geçerli bir email adresi giriniz" },
          { status: 400 }
        );
      }
    }

    // ✅ Bu sponsor bilgisi başka kullanıcıda kayıtlı mı kontrolü
    const existingWithSameIdentifier = await prisma.userSponsorInfo.findFirst({
      where: {
        sponsorId,
        identifier: trimmedIdentifier,
        userId: { not: userId } // Kendi kaydı hariç
      }
    });

    if (existingWithSameIdentifier) {
      return NextResponse.json(
        { error: `Bu ${sponsor.identifierType === 'email' ? 'email' : sponsor.identifierType === 'id' ? 'ID' : 'kullanıcı adı'} başka bir üyede kayıtlı.` },
        { status: 409 }
      );
    }

    // Mevcut kaydı kontrol et (log için)
    const existingInfo = await prisma.userSponsorInfo.findUnique({
      where: {
        userId_sponsorId: {
          userId,
          sponsorId,
        },
      },
    });

    const oldIdentifier = existingInfo?.identifier || null;
    const isUpdate = !!existingInfo;

    // Upsert: Varsa güncelle, yoksa oluştur
    const sponsorInfo = await prisma.userSponsorInfo.upsert({
      where: {
        userId_sponsorId: {
          userId,
          sponsorId,
        },
      },
      update: {
        identifier: trimmedIdentifier,
      },
      create: {
        userId,
        sponsorId,
        identifier: trimmedIdentifier,
      },
      include: {
        sponsor: {
          select: {
            id: true,
            name: true,
            identifierType: true,
            logoUrl: true,
          },
        },
      },
    });

    // Cache invalidate - sponsor bilgisi değişti
    invalidateCache.user(userId);
    enhancedCache.delete(CacheKeys.USER_STATS(userId));

    // Activity log
    const requestInfo = extractRequestInfo(request);
    await logSponsorInfoChange(
      userId,
      isUpdate ? 'sponsor_update' : 'sponsor_add',
      sponsorId,
      sponsor.name,
      oldIdentifier,
      trimmedIdentifier,
      sponsor.identifierType,
      requestInfo
    );

    return NextResponse.json({
      success: true,
      sponsorInfo,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }
    console.error("Sponsor bilgisi kaydetme hatası:", error);
    return NextResponse.json(
      { error: "Sponsor bilgisi kaydedilemedi" },
      { status: 500 }
    );
  }
}

// Sponsor bilgisini sil
export async function DELETE(request: NextRequest) {
  try {
    // Session kontrolü - artık query parametresi yerine session kullanıyoruz
    const session = await requireAuth(request);
    const userId = session.userId;

    const { sponsorId } = await request.json();

    if (!sponsorId) {
      return NextResponse.json(
        { error: "Sponsor ID gereklidir" },
        { status: 400 }
      );
    }

    // Mevcut kaydı al (log için)
    const existingInfo = await prisma.userSponsorInfo.findUnique({
      where: {
        userId_sponsorId: {
          userId,
          sponsorId,
        },
      },
      include: {
        sponsor: {
          select: {
            name: true,
            identifierType: true,
          },
        },
      },
    });

    if (!existingInfo) {
      return NextResponse.json(
        { error: "Sponsor bilgisi bulunamadı" },
        { status: 404 }
      );
    }

    await prisma.userSponsorInfo.delete({
      where: {
        userId_sponsorId: {
          userId,
          sponsorId,
        },
      },
    });

    // Cache invalidate - sponsor bilgisi silindi
    invalidateCache.user(userId);
    enhancedCache.delete(CacheKeys.USER_STATS(userId));

    // Activity log
    const requestInfo = extractRequestInfo(request);
    await logSponsorInfoChange(
      userId,
      'sponsor_delete',
      sponsorId,
      existingInfo.sponsor.name,
      existingInfo.identifier,
      null,
      existingInfo.sponsor.identifierType,
      requestInfo
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }
    console.error("Sponsor bilgisi silme hatası:", error);
    return NextResponse.json(
      { error: "Sponsor bilgisi silinemedi" },
      { status: 500 }
    );
  }
}
