import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileX, ArrowLeft } from "lucide-react";

export default function DealNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-muted p-3 shrink-0">
              <FileX className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg">Caso no encontrado</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Este caso no existe o fue eliminado.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Link href="/deals">
            <Button className="w-full cursor-pointer">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a casos
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
