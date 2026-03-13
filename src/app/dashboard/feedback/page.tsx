import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackList } from "@/components/feedback/feedback-list";

export default function FeedbackPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <FeedbackForm />
      <FeedbackList />
    </div>
  );
}
