"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateClient } from "@/hooks/use-clients";
import { ClientForm } from "../_components/client-form";

export default function NewClientPage() {
  const router = useRouter();
  const create = useCreateClient();

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
        <h1 className="text-2xl font-semibold">New client</h1>
        <p className="text-sm text-muted-foreground">Create a client record. You can add companies and documents afterwards.</p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <ClientForm
            submitLabel="Create client"
            busy={create.isPending}
            onCancel={() => router.push("/clients")}
            onSubmit={async (input) => {
              const created = await create.mutateAsync(input);
              router.push(`/clients/${created.id}`);
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
