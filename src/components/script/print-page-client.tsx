"use client";

import { useState } from "react";
import { PrintToolbar } from "./print-toolbar";
import { PrintView, type PrintTemplate } from "./print-view";

interface CallScript {
  id: string;
  rep_name: string;
  section_1: string;
  section_2: string;
  section_3: string;
  section_4: string;
  section_5: string;
  section_6: string;
  updated_at: string;
}

export function PrintPageClient({ script }: { script: CallScript }) {
  const [template, setTemplate] = useState<PrintTemplate>("classic");

  return (
    <>
      <PrintToolbar template={template} onTemplateChange={setTemplate} />
      <PrintView script={script} template={template} />
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  );
}
