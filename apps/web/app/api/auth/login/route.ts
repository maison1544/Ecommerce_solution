import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
