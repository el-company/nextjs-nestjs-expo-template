import React, { Suspense } from "react";
import Link from "next/link";
import { Button } from "@repo/ui/components/base/button";
import { type JSX } from "react";
import { HelloExample } from "@/components/examples/hello-example";
import { AuthStatus } from "@/components/auth-status";

export default function Home(): JSX.Element {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center">
        Welcome to App Template
      </h1>

      <div className="max-w-2xl mx-auto text-center mb-8">
        <p className="text-xl mb-4">
          A modern web application with Next.js, NestJS, and Expo
        </p>
        <p className="mb-6">
          This template includes JWT authentication, TailwindCSS styling,
          and tRPC for end-to-end type safety.
        </p>

        <AuthStatus />

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">tRPC Example</h2>
          <Suspense fallback={<div className="animate-pulse h-24 bg-muted rounded-lg" />}>
            <HelloExample />
          </Suspense>
        </div>
      </div>

      <div className="flex flex-col gap-4 items-center justify-center mt-10">
        <Link href="/demo">
          <Button variant="outline">Demo</Button>
        </Link>
      </div>
    </div>
  );
}
