import * as React from "react";
import {
  Card as ShadcnCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: "p-0",
  sm: "p-3",
  md: "p-6",
  lg: "p-8",
};

export const Card = ({
  title,
  description,
  children,
  className,
  padding = 'md',
}: CardProps) => {
  return (
    <ShadcnCard className={cn("overflow-hidden", className)}>
      {(title || description) && (
        <CardHeader className={cn(padding !== 'none' ? paddingMap[padding] : 'p-6', "pb-2")}>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn(paddingMap[padding], (title || description) && "pt-0")}>
        {children}
      </CardContent>
    </ShadcnCard>
  );
};
