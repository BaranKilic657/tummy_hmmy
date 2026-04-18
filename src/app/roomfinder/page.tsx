import { RoomFinderClient } from "./RoomFinderClient";

type RoomFinderPageProps = {
  searchParams: Promise<{
    room?: string | string[];
  }>;
};

export default async function RoomFinderPage({ searchParams }: RoomFinderPageProps) {
  const resolved = await searchParams;
  const roomParam = resolved.room;
  const initialRoomQuery = Array.isArray(roomParam) ? roomParam[0] ?? "" : roomParam ?? "";

  return <RoomFinderClient initialRoomQuery={initialRoomQuery.trim()} />;
}
