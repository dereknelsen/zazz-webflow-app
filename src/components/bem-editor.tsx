import { useState, useEffect } from "preact/hooks";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2Icon, PencilLineIcon } from "lucide-react";

export function BemEditor() {
  const [bemStyles, setBemStyles] = useState({
    block: "",
    element: "",
    modifier: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  // Store the currently selected element in state
  const [selectedElement, setSelectedElement] = useState<null | any>(null);
  // Add state to track if selected element is a component instance
  const [isComponentInstance, setIsComponentInstance] = useState(false);
  // Add state to track if the selected element has styles
  const [hasStyles, setHasStyles] = useState(true);

  useEffect(() => {
    const handler = (element: null | AnyElement) => {
      setSelectedElement(element);
      // Check if the element is a component instance
      if (element && element.type === "ComponentInstance") {
        setIsComponentInstance(true);
        setBemStyles({ block: "", element: "", modifier: "" });
        setHasStyles(false);
      } else {
        setIsComponentInstance(false);
        const selectedElement = element;
        // Check if the element has styles
        if (selectedElement && selectedElement.styles) {
          selectedElement.getStyles().then((styles: any[]) => {
            setHasStyles(styles && styles.length > 0);
          });
        } else {
          setHasStyles(false);
        }
        const getStyleName = async () => {
          if (selectedElement?.styles) {
            const styles = await selectedElement.getStyles();
            if (!styles[0]) {
              setBemStyles({ block: "", element: "", modifier: "" });
              return;
            }
            const styleName = await styles[0].getName();
            setBemStyles({
              block: styleName.split("__")[0],
              element: styleName.split("__")[1] || "",
              modifier: styleName.split("--")[1] || "",
            });
          }
        };

        getStyleName();
      }
    };

    const unsubscribe = webflow.subscribe("selectedelement", handler);

    // Cleanup on unmount
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  async function handleUpdateBlock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const newBlockName = formData.get("block") as string;

      console.log(newBlockName);
      console.log(bemStyles.block);

      if (!newBlockName || newBlockName === bemStyles.block) {
        console.log("No change needed"); // Add logging to debug
        return;
      }

      // Get all styles that match the current block pattern
      const allStyles = await webflow.getAllStyles();
      // Use Promise.all to get all style names in parallel
      const allStyleNames = await Promise.all(
        allStyles.map((style: any) => style.getName())
      );
      const stylesToUpdate: Array<{ oldStyle: any; newName: string }> = [];

      // Find styles that start with the current block name
      allStyles.forEach((style, idx) => {
        const styleName = allStyleNames[idx];
        if (styleName && styleName.startsWith(bemStyles.block)) {
          // Replace the block part with the new block name
          const newName = styleName.replace(
            new RegExp(`^${bemStyles.block}`),
            newBlockName
          );
          stylesToUpdate.push({ oldStyle: style, newName });
        }
      });

      if (stylesToUpdate.length === 0) {
        setIsLoading(false);
        return;
      }

      // Create new styles and update elements in parallel
      const createdStyleNames = new Set<string>();
      await Promise.all(
        stylesToUpdate.map(async ({ oldStyle, newName }) => {
          if (createdStyleNames.has(newName)) {
            // Already created this style in this batch, skip
            return;
          }
          createdStyleNames.add(newName);
          const properties = await oldStyle.getProperties();
          const newStyle = await webflow.createStyle(newName);
          await copyAllStyleProperties(oldStyle, newStyle);

          await updateElementsWithStyle(oldStyle, newStyle);
        })
      );

      setBemStyles((prev) => ({ ...prev, block: newBlockName }));
    } catch (error) {
      console.error("Error updating block name:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Handler for updating the element part of the BEM name
  async function handleUpdateElement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!selectedElement) return;
      const formData = new FormData(e.currentTarget);
      const newElementName = formData.get("element") as string;
      if (newElementName === bemStyles.element) return;
      const styles = await selectedElement.getStyles();
      if (!styles[0]) {
        setIsLoading(false);
        return;
      }
      const oldStyle = styles[0];
      const oldStyleName = await oldStyle.getName();
      // Parse current BEM parts
      const block = bemStyles.block;
      const modifier = bemStyles.modifier;
      // Compose new style name
      let newStyleName = block;
      if (newElementName) newStyleName += `__${newElementName}`;
      if (modifier) newStyleName += `--${modifier}`;
      // Create new style and copy properties
      const newStyle = await webflow.createStyle(newStyleName);
      await copyAllStyleProperties(oldStyle, newStyle);
      // Replace style on selected element only
      const elementStyles = await selectedElement.getStyles();
      const styleNames = await Promise.all(
        elementStyles.map((style: any) => style.getName())
      );
      const updatedStyles = await Promise.all(
        elementStyles.map(async (style: any, idx: number) => {
          const styleName = styleNames[idx];
          return styleName === oldStyleName ? newStyle : style;
        })
      );
      await selectedElement.setStyles(updatedStyles);
      setBemStyles((prev) => ({ ...prev, element: newElementName }));
    } catch (error) {
      console.error("Error updating element name:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Handler for updating the modifier part of the BEM name
  async function handleUpdateModifier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!selectedElement) return;
      const formData = new FormData(e.currentTarget);
      const newModifierName = formData.get("modifier") as string;
      if (newModifierName === bemStyles.modifier) return;
      const styles = await selectedElement.getStyles();
      if (!styles[0]) {
        setIsLoading(false);
        return;
      }
      const oldStyle = styles[0];
      const oldStyleName = await oldStyle.getName();
      // Parse current BEM parts
      const block = bemStyles.block;
      const element = bemStyles.element;
      // Compose new style name
      let newStyleName = block;
      if (element) newStyleName += `__${element}`;
      if (newModifierName) newStyleName += `--${newModifierName}`;
      // Create new style and copy properties
      const newStyle = await webflow.createStyle(newStyleName);
      await copyAllStyleProperties(oldStyle, newStyle);
      // Replace style on selected element only
      const elementStyles = await selectedElement.getStyles();
      const styleNames = await Promise.all(
        elementStyles.map((style: any) => style.getName())
      );
      const updatedStyles = await Promise.all(
        elementStyles.map(async (style: any, idx: number) => {
          const styleName = styleNames[idx];
          return styleName === oldStyleName ? newStyle : style;
        })
      );
      await selectedElement.setStyles(updatedStyles);
      setBemStyles((prev) => ({ ...prev, modifier: newModifierName }));
    } catch (error) {
      console.error("Error updating modifier name:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Helper function to find and update elements with a specific style
  async function updateElementsWithStyle(oldStyle: any, newStyle: any) {
    const rootElement = await webflow.getRootElement();
    await traverseAndUpdateElements(rootElement, oldStyle, newStyle);
  }

  async function traverseAndUpdateElements(
    element: any,
    oldStyle: any,
    newStyle: any
  ) {
    if (element.styles) {
      try {
        const elementStyles = await element.getStyles();
        const oldStyleName = await oldStyle.getName();

        // Use Promise.all to get all style names in parallel
        const styleNames = await Promise.all(
          elementStyles.map((style: any) => style.getName())
        );
        const hasOldStyle = styleNames.includes(oldStyleName);

        if (hasOldStyle) {
          // Replace old style with new style
          const updatedStyles = await Promise.all(
            elementStyles.map(async (style: any, idx: number) => {
              const styleName = styleNames[idx];
              return styleName === oldStyleName ? newStyle : style;
            })
          );

          await element.setStyles(updatedStyles);
        }
      } catch (error) {
        console.error("Error updating elements with style:", error);
      }
    }

    // Recursively check children if element has them
    if (element.children) {
      try {
        const children = await element.getChildren();
        // Use Promise.all to recurse into all children in parallel
        await Promise.all(
          children.map((child: any) =>
            traverseAndUpdateElements(child, oldStyle, newStyle)
          )
        );
      } catch (error) {
        console.error("Error updating elements with style:", error);
      }
    }
  }

  // Helper to copy all style properties for all breakpoints and pseudo-states
  async function copyAllStyleProperties(oldStyle: any, newStyle: any) {
    // List of breakpoints and pseudo-states as per Webflow API
    webflow.getCurrentPage();
    const breakpoints = [
      undefined, // default ("main")
      "xxl",
      "xl",
      "large",
      "main",
      "medium",
      "small",
      "tiny",
    ];
    const pseudos = [
      undefined, // default ("noPseudo")
      "noPseudo",
      "nth-child(odd)",
      "nth-child(even)",
      "first-child",
      "last-child",
      "hover",
      "active",
      "pressed",
      "visited",
      "focus",
      "focus-visible",
      "focus-within",
      "placeholder",
      "empty",
      "before",
      "after",
    ];
    for (const breakpoint of breakpoints) {
      for (const pseudo of pseudos) {
        // Skip undefined/undefined (handled by default)
        if (breakpoint === undefined && pseudo === undefined) continue;
        const options: any = {};
        if (breakpoint !== undefined) options.breakpoint = breakpoint;
        if (pseudo !== undefined) options.pseudo = pseudo;
        try {
          const properties = await oldStyle.getProperties(options);
          if (properties && Object.keys(properties).length > 0) {
            await newStyle.setProperties(properties, options);
          }
        } catch (err) {
          // Some combinations may not be supported, skip errors
        }
      }
    }
    // Also copy the default (no options)
    try {
      const properties = await oldStyle.getProperties();
      if (properties && Object.keys(properties).length > 0) {
        await newStyle.setProperties(properties);
      }
    } catch (err) {}
    // Save the new style
    if (typeof newStyle.save === "function") {
      await newStyle.save();
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <form onSubmit={handleUpdateBlock} className="flex gap-1 w-full">
        <Label className="grid grid-cols-4 gap-4 w-full">
          <span>Block</span>
          <div className="flex gap-1 col-span-3 w-full">
            <Input
              name="block"
              placeholder="Block name"
              value={isComponentInstance ? "" : bemStyles.block}
              disabled={isComponentInstance || !hasStyles}
            />
            <Button
              type="submit"
              size={"icon"}
              disabled={isLoading || isComponentInstance || !hasStyles}
            >
              {isLoading ? (
                <Loader2Icon className="size-3 animate-spin" strokeWidth={1} />
              ) : (
                <PencilLineIcon className="size-3" strokeWidth={1} />
              )}
            </Button>
          </div>
        </Label>
      </form>
      <form onSubmit={handleUpdateElement} className="flex gap-1">
        <Label className="grid grid-cols-4 gap-4 w-full">
          <span>Element</span>
          <div className="flex gap-1 col-span-3 w-full">
            <Input
              name="element"
              placeholder="Element name"
              value={isComponentInstance ? "" : bemStyles.element}
              disabled={isComponentInstance || !hasStyles}
            />
            <Button
              type="submit"
              size={"icon"}
              disabled={isLoading || isComponentInstance || !hasStyles}
            >
              {isLoading ? (
                <Loader2Icon className="size-3 animate-spin" strokeWidth={1} />
              ) : (
                <PencilLineIcon className="size-3" strokeWidth={1} />
              )}
            </Button>
          </div>
        </Label>
      </form>
      <form onSubmit={handleUpdateModifier} className="flex gap-1">
        <Label className="grid grid-cols-4 gap-4 w-full">
          <span>Modifier</span>
          <div className="flex gap-1 col-span-3 w-full">
            <Input
              name="modifier"
              placeholder="Modifier name"
              value={isComponentInstance ? "" : bemStyles.modifier}
              disabled={isComponentInstance || !hasStyles}
            />
            <Button
              type="submit"
              size={"icon"}
              disabled={isLoading || isComponentInstance || !hasStyles}
            >
              {isLoading ? (
                <Loader2Icon className="size-3 animate-spin" strokeWidth={1} />
              ) : (
                <PencilLineIcon className="size-3" strokeWidth={1} />
              )}
            </Button>
          </div>
        </Label>
      </form>
    </section>
  );
}
