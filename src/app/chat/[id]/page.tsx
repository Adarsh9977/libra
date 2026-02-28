import { ChatApp } from "@/components/ChatApp";

export default function ChatPage({ params }: { params: { id: string } }) {
  return <ChatApp initialChatId={params.id} />;
}

