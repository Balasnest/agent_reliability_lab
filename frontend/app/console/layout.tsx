import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ShopNova Support Console",
  description: "Reviewer console for the ShopNova customer support agent",
};

export default function ConsoleLayout({ children }: LayoutProps<"/console">) {
  return children;
}
