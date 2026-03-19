import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@repo/ui/components/base/button";
import { type JSX } from "react";

const AllComponentsDemo = dynamic(
  () =>
    import("@/components/demos/all-components-demo").then(
      (m) => m.AllComponentsDemo
    ),
  { loading: () => <div className="animate-pulse h-48 w-full bg-muted rounded-lg" /> }
);

export default function Demo(): JSX.Element {
  return (
    <div className="overflow-y-auto flex flex-col gap-4 items-center justify-center mt-10">
      <h1 className="text-2xl font-bold">Demo</h1>
      <Link href="/">
        <Button variant="outline">Home</Button>
      </Link>
      <AllComponentsDemo />
    </div>
  );
}
