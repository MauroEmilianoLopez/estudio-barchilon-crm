"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDbError =
    error.message?.includes("TURSO") ||
    error.message?.includes("libsql") ||
    error.message?.includes("database") ||
    error.message?.includes("connect");

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-bold mb-2">
        {isDbError ? "Error de conexion a la base de datos" : "Ocurrio un error"}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {isDbError
          ? "Verifica que las variables TURSO_DATABASE_URL y TURSO_AUTH_TOKEN esten configuradas en Vercel > Settings > Environment Variables."
          : "Algo salio mal. Intenta recargar la pagina."}
      </p>
      <Button onClick={reset} className="cursor-pointer">
        Reintentar
      </Button>
    </div>
  );
}
