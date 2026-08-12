import { Suspense } from "react";
import { NewAgreementForm } from "@/app/components/NewAgreementForm";

export default function NewAgreementPage() {
  return (
    <Suspense fallback={null}>
      <NewAgreementForm />
    </Suspense>
  );
}
