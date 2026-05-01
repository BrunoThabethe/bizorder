import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import { SignedImage } from "@/components/orders/SignedImage";
import { Card, CardContent } from "@/components/ui/card";
import { fetchProgressLogs } from "@/lib/admin/queries";

type Log = {
  id: string;
  order_id: string;
  business_id: string;
  task_id: string | null;
  author_id: string;
  note: string | null;
  media_urls: string[];
  stage: string | null;
  created_at: string;
};

const AdminUploadsPage = () => {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "uploads"], queryFn: fetchProgressLogs });
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-bold">Uploads & proof logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Recent media and progress notes attached to orders. Click a photo to zoom in.</p>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (data ?? []).length === 0 ? (
          <Card className="rounded-3xl border-0 shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No proof uploads yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(data as Log[]).map((log) => (
              <Card key={log.id} className="rounded-3xl border-0 shadow-card">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Order <span className="font-mono">{log.order_id.slice(0, 8)}…</span>
                    </span>
                    <span>{new Date(log.created_at).toLocaleString("en-GB")}</span>
                  </div>
                  {log.stage && (
                    <span className="inline-block rounded-full bg-foreground/10 px-2 py-1 text-xs font-semibold">
                      {log.stage}
                    </span>
                  )}
                  {log.note && <p className="text-sm">{log.note}</p>}
                  {log.media_urls.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {log.media_urls.map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setPreviewPath(url)}
                          className="block overflow-hidden rounded-xl transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-foreground"
                          aria-label="View proof photo"
                        >
                          <SignedImage
                            path={url}
                            alt="Proof"
                            className="aspect-square w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <ImageLightbox path={previewPath} onClose={() => setPreviewPath(null)} />
    </AdminLayout>
  );
};

export default AdminUploadsPage;
