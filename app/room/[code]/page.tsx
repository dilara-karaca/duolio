import { Suspense } from "react";
import { RoomClient } from "@/components/RoomClient";
import { ScreenFallback } from "@/components/ui";

export default function RoomPage() {
  return (
    <Suspense fallback={<ScreenFallback label="Connecting…" />}>
      <RoomClient />
    </Suspense>
  );
}
