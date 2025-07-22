import { useState, useRef, useEffect } from "react";
import { utilityClasses } from "@/lib/utility-classes";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

export function UtilityEditor() {
  const [utilityStyles, setUtilityStyles] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to selected element changes
  useEffect(() => {
    const handler = (element: AnyElement) => {
      if (!element) return;
      setSelectedElement(element);

      if (element.type === "DOM") {
        const getElementClasses = async () => {
          const classAttr = await element.getAttribute("class");
          console.log("classAttr", classAttr);
          if (classAttr && classAttr.trim().length > 0) {
            setUtilityStyles(classAttr.trim().split(/\s+/).filter(Boolean));
          } else {
            setUtilityStyles([]);
          }
        };
        getElementClasses();
      } else if (element && element.customAttributes) {
        const getElementClasses = async () => {
          const classAttr = await element.getCustomAttribute("class");
          console.log("classAttr", classAttr);
          if (classAttr && classAttr.trim().length > 0) {
            setUtilityStyles(classAttr.trim().split(/\s+/).filter(Boolean));
          } else {
            setUtilityStyles([]);
          }
        };
        getElementClasses();
      } else {
        setUtilityStyles([]);
      }
    };
    const unsubscribe = webflow.subscribe("selectedelement", handler);
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Helper to update the class attribute on the selected element
  const updateElementClasses = (newClasses: string[]) => {
    setUtilityStyles(newClasses);
    const classString = newClasses.length > 0 ? newClasses.join(" ") : " ";
    if (selectedElement && selectedElement.type === "DOM") {
      selectedElement.setAttribute("class", classString);
    } else if (selectedElement && selectedElement.customAttributes) {
      selectedElement.setCustomAttribute("class", classString);
    }
  };

  const filtered = utilityClasses.filter(
    (u) =>
      u.toLowerCase().includes(inputValue.toLowerCase()) &&
      !utilityStyles.includes(u)
  );

  const handleSelect = (value: string) => {
    const newClasses = [...utilityStyles, value];
    updateElementClasses(newClasses);
    setInputValue("");
    setShowDropdown(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemove = (value: string) => {
    const newClasses = utilityStyles.filter((v) => v !== value);
    updateElementClasses(newClasses);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev <= 0 ? filtered.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        handleSelect(filtered[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  // Reset highlightedIndex when dropdown or filtered changes
  useEffect(() => {
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
  }, [showDropdown, inputValue]);

  return (
    <div className="flex flex-col gap-2 relative">
      <div>
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setInputValue(e.currentTarget.value);
            setShowDropdown(e.currentTarget.value.length > 0);
          }}
          onFocus={() => setShowDropdown(inputValue.length > 0)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
          onKeyDown={handleKeyDown}
          placeholder="Type to add utility class..."
          className="w-full"
          disabled={!selectedElement}
        />
        {showDropdown && filtered.length > 0 && (
          <div className="z-10 mt-1 w-full rounded border bg-popover overflow-auto">
            {filtered.map((utility, idx) => (
              <div
                key={utility}
                className={`px-3 py-2 cursor-pointer hover:bg-accent ${
                  idx === highlightedIndex ? "bg-accent" : ""
                }`}
                onMouseDown={() => handleSelect(utility)}
                aria-selected={idx === highlightedIndex}
              >
                {utility}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {utilityStyles.map((utility) => {
          const isValid = utilityClasses.includes(utility);
          return (
            <span
              key={utility}
              className={cn(
                "inline-flex items-center rounded bg-primary px-1 h-5.5 text-text1 border border-primary",
                !isValid && "bg-destructive border-destructive"
              )}
              title={
                !isValid
                  ? "This class is not in the utility class list and may be invalid."
                  : undefined
              }
            >
              {utility}
              <button
                type="button"
                className="ml-1 hover:opacity-50"
                onClick={() => handleRemove(utility)}
                aria-label={`Remove ${utility}`}
              >
                <X className="size-3" strokeWidth={1} />
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
