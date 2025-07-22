import { useEffect, useState } from "react";
import { BemEditor } from "@/components/bem-editor";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UtilityEditor } from "@/components/utility-editor";

export function Home() {
  const [isDesignerMode, setIsDesignerMode] = useState(false);

  useEffect(() => {
    const getCanAccessDesigner = async () => {
      const canAccessDesigner = await webflow.canForAppMode([
        "canManageAssets",
        "canAccessAssets",
        "canDesign",
        "canCreateStyles",
        "canModifyStyles",
        "canReadVariables",
        "canModifyVariables",
        "canModifyImageElement",
      ]);

      setIsDesignerMode(canAccessDesigner.canDesign);
    };

    getCanAccessDesigner();
  }, []);

  if (!isDesignerMode) {
    return (
      <main className="p-2">
        <div className="text-center border border-dashed p-4 rounded">
          Switch to design mode
        </div>
      </main>
    );
  }

  return (
    <main>
      <Accordion
        type="multiple"
        defaultValue={["bem-editor", "utility-editor"]}
        className="w-full border-b"
      >
        <AccordionItem value="bem-editor">
          <AccordionTrigger>BEM Class Editor</AccordionTrigger>
          <AccordionContent>
            <BemEditor />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="utility-editor">
          <AccordionTrigger>Utility Editor</AccordionTrigger>
          <AccordionContent>
            <UtilityEditor />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </main>
  );
}
