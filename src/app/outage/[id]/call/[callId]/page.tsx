"use client";

import { useParams } from "next/navigation";
import { CallDetail } from "@/components/board/call-detail";

export default function CallDetailPage() {
  const params = useParams<{ callId: string }>();
  return <CallDetail callId={params.callId} />;
}
