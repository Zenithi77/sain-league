import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export async function POST(request: NextRequest) {
  // Authentication check
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Файл оруулна уу" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Файлын хэмжээ 5MB-с хэтрэхгүй байх ёстой" },
        { status: 400 },
      );
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Зөвхөн зураг файл (JPEG, PNG, GIF, WebP) зөвшөөрөгдөнө" },
        { status: 400 },
      );
    }

    // Upload to Firebase Storage via the admin SDK
    const { getStorage } = await import("firebase-admin/storage");
    const bucketName =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`;
    const bucket = getStorage().bucket(bucketName);

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `news-images/${uuidv4()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const fileRef = bucket.file(fileName);
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Make publicly readable
    await fileRef.makePublic();

    const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Файл байршуулахад алдаа гарлаа" },
      { status: 500 },
    );
  }
}
