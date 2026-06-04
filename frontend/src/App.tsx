import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CircleAlert,
  Croissant,
  Edit3,
  Gauge,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Sigma,
  Trash2,
  Utensils
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis
} from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastMessage, Toaster } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { API_BASE_URL, api, normalizeApiError } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber, normalizeKey, parseDecimal, titleCase } from "@/lib/format";
import { buildOrModel, computeIngredientUsage, explainResult, getProducts } from "@/lib/model";
import type {
  Bahan,
  BahanInput,
  DataStatus,
  OptimizationResult,
  Parameter,
  Resep,
  ResepInput,
  TabKey
} from "@/types";

type BahanForm = {
  nama_bahan: string;
  harga: string;
  stok: string;
};

type ResepForm = {
  produk: string;
  bahan: string;
  jumlah_gram: string;
};

type DeleteTarget =
  | { type: "bahan"; item: Bahan }
  | { type: "resep"; item: Resep };

const emptyBahanForm: BahanForm = {
  nama_bahan: "",
  harga: "",
  stok: ""
};

const emptyResepForm: ResepForm = {
  produk: "",
  bahan: "",
  jumlah_gram: ""
};

const tabItems: Array<{ value: TabKey; label: string; icon: ReactNode }> = [
  { value: "hasil", label: "Hasil Optimasi", icon: <BarChart3 className="h-4 w-4" /> },
  { value: "model", label: "Model OR", icon: <Sigma className="h-4 w-4" /> },
  { value: "analisis", label: "Analisis Bahan", icon: <Gauge className="h-4 w-4" /> },
  { value: "bahan", label: "Data Bahan", icon: <Package className="h-4 w-4" /> },
  { value: "resep", label: "Data Resep", icon: <Utensils className="h-4 w-4" /> },
  { value: "pengaturan", label: "Pengaturan", icon: <Settings className="h-4 w-4" /> }
];

function validateBahan(form: BahanForm): BahanInput {
  const nama_bahan = normalizeKey(form.nama_bahan);
  const harga = parseDecimal(form.harga);
  const stok = parseDecimal(form.stok);

  if (!nama_bahan) {
    throw new Error("Nama bahan tidak boleh kosong.");
  }

  if (!Number.isFinite(harga) || harga < 0) {
    throw new Error("Harga harus berupa angka nol atau lebih.");
  }

  if (!Number.isFinite(stok) || stok < 0) {
    throw new Error("Stok harus berupa angka nol atau lebih.");
  }

  return { nama_bahan, harga, stok };
}

function validateResep(form: ResepForm): ResepInput {
  const produk = normalizeKey(form.produk);
  const bahan = normalizeKey(form.bahan);
  const jumlah_gram = parseDecimal(form.jumlah_gram);

  if (!produk) {
    throw new Error("Nama produk tidak boleh kosong.");
  }

  if (!bahan) {
    throw new Error("Bahan harus dipilih.");
  }

  if (!Number.isFinite(jumlah_gram) || jumlah_gram <= 0) {
    throw new Error("Jumlah gram harus lebih besar dari nol.");
  }

  return { produk, bahan, jumlah_gram };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("hasil");
  const [status, setStatus] = useState<DataStatus | null>(null);
  const [bahan, setBahan] = useState<Bahan[]>([]);
  const [resep, setResep] = useState<Resep[]>([]);
  const [parameter, setParameter] = useState<Parameter[]>([]);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [bahanSheetOpen, setBahanSheetOpen] = useState(false);
  const [resepSheetOpen, setResepSheetOpen] = useState(false);
  const [editingBahan, setEditingBahan] = useState<Bahan | null>(null);
  const [editingResep, setEditingResep] = useState<Resep | null>(null);
  const [bahanForm, setBahanForm] = useState<BahanForm>(emptyBahanForm);
  const [resepForm, setResepForm] = useState<ResepForm>(emptyResepForm);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [reloadOpen, setReloadOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [parameterDraft, setParameterDraft] = useState<Record<string, string>>({});
  const [recipeFilter, setRecipeFilter] = useState("semua");

  async function loadReferenceData() {
    const [nextStatus, nextBahan, nextResep, nextParameter] = await Promise.all([
      api.getDataStatus(),
      api.getBahan(),
      api.getResep(),
      api.getParameter()
    ]);

    setStatus(nextStatus);
    setBahan(nextBahan);
    setResep(nextResep);
    setParameter(nextParameter);
    setParameterDraft(Object.fromEntries(nextParameter.map((item) => [item.parameter, String(item.nilai)])));
  }

  async function runOptimization() {
    setOptimizing(true);
    try {
      const result = await api.optimize();
      setOptimization(result);
      return result;
    } finally {
      setOptimizing(false);
    }
  }

  async function refreshAll(message?: string) {
    setLoading(true);
    setGlobalError(null);

    try {
      await loadReferenceData();
      await runOptimization();
      if (message) {
        showToast(message);
      }
    } catch (error) {
      setGlobalError(normalizeApiError(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  const margin = useMemo(
    () => parameter.find((item) => item.parameter === "margin")?.nilai ?? 0,
    [parameter]
  );

  const products = useMemo(() => getProducts(resep, optimization), [optimization, resep]);

  const productionRows = useMemo(
    () =>
      products.map((produk) => ({
        produk,
        nama: titleCase(produk),
        jumlah: optimization?.jumlah_produksi_optimal[produk] ?? 0,
        biaya: optimization?.biaya_produk[produk] ?? 0,
        harga: optimization?.harga_produk_bulat[produk] ?? 0,
        profit: optimization?.profit_per_produk[produk] ?? 0
      })),
    [optimization, products]
  );

  const totalProduction = productionRows.reduce((sum, item) => sum + item.jumlah, 0);
  const usageRows = useMemo(
    () => computeIngredientUsage(resep, bahan, optimization?.jumlah_produksi_optimal ?? {}),
    [bahan, optimization, resep]
  );
  const sortedUsageRows = useMemo(
    () => [...usageRows].sort((a, b) => b.percentage - a.percentage || a.bahan.localeCompare(b.bahan)),
    [usageRows]
  );
  const orModel = useMemo(() => buildOrModel(resep, bahan, optimization), [bahan, optimization, resep]);
  const resultExplanation = useMemo(
    () => explainResult(sortedUsageRows, optimization),
    [optimization, sortedUsageRows]
  );
  const productOptions = useMemo(
    () => [...new Set(resep.map((item) => item.produk))].sort((a, b) => a.localeCompare(b)),
    [resep]
  );
  const filteredResep = useMemo(
    () => (recipeFilter === "semua" ? resep : resep.filter((item) => item.produk === recipeFilter)),
    [recipeFilter, resep]
  );

  function showToast(title: string, variant: "success" | "error" = "success", description?: string) {
    setToast({ title, variant, description });
  }

  function openCreateBahan() {
    setEditingBahan(null);
    setBahanForm(emptyBahanForm);
    setFormError(null);
    setBahanSheetOpen(true);
  }

  function openEditBahan(item: Bahan) {
    setEditingBahan(item);
    setBahanForm({
      nama_bahan: item.nama_bahan,
      harga: String(item.harga),
      stok: String(item.stok)
    });
    setFormError(null);
    setBahanSheetOpen(true);
  }

  function openCreateResep() {
    setEditingResep(null);
    setResepForm({
      ...emptyResepForm,
      bahan: bahan[0]?.nama_bahan ?? ""
    });
    setFormError(null);
    setResepSheetOpen(true);
  }

  function openEditResep(item: Resep) {
    setEditingResep(item);
    setResepForm({
      produk: item.produk,
      bahan: item.bahan,
      jumlah_gram: String(item.jumlah_gram)
    });
    setFormError(null);
    setResepSheetOpen(true);
  }

  async function submitBahan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const payload = validateBahan(bahanForm);
      if (editingBahan) {
        await api.updateBahan(editingBahan.nama_bahan, payload);
        showToast("Bahan berhasil diperbarui.");
      } else {
        await api.createBahan(payload);
        showToast("Bahan berhasil ditambahkan.");
      }
      setBahanSheetOpen(false);
      await refreshAll();
    } catch (error) {
      setFormError(normalizeApiError(error));
      showToast("Gagal menyimpan bahan.", "error", normalizeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitResep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const payload = validateResep(resepForm);
      if (editingResep) {
        await api.updateResep(editingResep.produk, editingResep.bahan, payload);
        showToast("Resep berhasil diperbarui.");
      } else {
        await api.createResep(payload);
        showToast("Resep berhasil ditambahkan.");
      }
      setResepSheetOpen(false);
      await refreshAll();
    } catch (error) {
      setFormError(normalizeApiError(error));
      showToast("Gagal menyimpan resep.", "error", normalizeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setSaving(true);
    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      if (target.type === "bahan") {
        await api.deleteBahan(target.item.nama_bahan);
        showToast("Bahan berhasil dihapus.");
      } else {
        await api.deleteResep(target.item.produk, target.item.bahan);
        showToast("Resep berhasil dihapus.");
      }
      await refreshAll();
    } catch (error) {
      setGlobalError(normalizeApiError(error));
      showToast("Gagal menghapus data.", "error", normalizeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function saveParameter(item: Parameter) {
    const value = parseDecimal(parameterDraft[item.parameter] ?? String(item.nilai));
    if (!Number.isFinite(value)) {
      setGlobalError("Nilai parameter harus berupa angka.");
      return;
    }

    setSaving(true);
    setGlobalError(null);

    try {
      await api.updateParameter(item.parameter, {
        parameter: item.parameter,
        nilai: value
      });
      await refreshAll("Parameter berhasil disimpan.");
    } catch (error) {
      setGlobalError(normalizeApiError(error));
      showToast("Gagal menyimpan parameter.", "error", normalizeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function reloadData() {
    setSaving(true);
    setReloadOpen(false);
    setGlobalError(null);

    try {
      await api.reloadData();
      await refreshAll("Data backend berhasil dimuat ulang.");
    } catch (error) {
      setGlobalError(normalizeApiError(error));
      showToast("Gagal memuat ulang data.", "error", normalizeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function rerunOptimization() {
    setGlobalError(null);
    try {
      await runOptimization();
      showToast("Optimasi berhasil dijalankan ulang.");
    } catch (error) {
      setGlobalError(normalizeApiError(error));
      showToast("Gagal menjalankan optimasi.", "error", normalizeApiError(error));
    }
  }

  return (
    <TooltipProvider delayDuration={180}>
      <div className="bakery-shell min-h-screen text-foreground">
        <header className="bakery-header bakery-header--bar border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="bakery-mark flex h-14 w-14 shrink-0 items-center justify-center rounded-lg">
                  <Croissant className="h-7 w-7" />
                </div>
                <h1 className="display-serif text-3xl font-bold tracking-normal sm:text-4xl">
                  Optimasi Produksi Bakery
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="min-h-11 border-accent/70 bg-background text-foreground hover:bg-secondary hover:text-foreground"
                  variant="outline"
                  onClick={() => void rerunOptimization()}
                  disabled={optimizing || loading}
                >
                  {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sigma className="h-4 w-4" />}
                  Jalankan optimasi
                </Button>
                <Button className="min-h-11 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setReloadOpen(true)} disabled={loading || saving}>
                  <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                  Muat ulang data
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan data aktif">
            <Fact label="Update terakhir" value={formatDate(status?.last_update)} />
            <Fact label="Total produk" value={formatNumber(status?.total_produk)} />
            <Fact label="Total bahan" value={formatNumber(status?.total_bahan)} />
            <Fact label="Margin" value={`${formatNumber(margin * 100, 1)}%`} />
          </section>

          {globalError ? (
            <Alert variant="destructive" className="mt-5 flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 text-destructive" />
              <AlertDescription>
                {globalError}
                <Button className="ml-0 mt-3 sm:ml-3 sm:mt-0" size="sm" variant="outline" onClick={() => void refreshAll()}>
                  Coba lagi
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="mt-6">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 lg:grid-cols-6">
              {tabItems.map((item) => (
                <TabsTrigger key={item.value} value={item.value} className="gap-2 py-2">
                  {item.icon}
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="hasil">
              <ResultTab
                loading={loading}
                optimizing={optimizing}
                optimization={optimization}
                productionRows={productionRows}
                totalProduction={totalProduction}
                resultExplanation={resultExplanation}
              />
            </TabsContent>
            <TabsContent value="model">
              <ModelTab loading={loading} optimization={optimization} model={orModel} />
            </TabsContent>
            <TabsContent value="analisis">
              <AnalysisTab loading={loading} usageRows={sortedUsageRows} />
            </TabsContent>
            <TabsContent value="bahan">
              <BahanTab
                bahan={bahan}
                loading={loading}
                saving={saving}
                resep={resep}
                onCreate={openCreateBahan}
                onEdit={openEditBahan}
                onDelete={(item) => setDeleteTarget({ type: "bahan", item })}
              />
            </TabsContent>
            <TabsContent value="resep">
              <ResepTab
                bahan={bahan}
                resep={filteredResep}
                allResep={resep}
                loading={loading}
                saving={saving}
                filter={recipeFilter}
                productOptions={productOptions}
                onFilterChange={setRecipeFilter}
                onCreate={openCreateResep}
                onEdit={openEditResep}
                onDelete={(item) => setDeleteTarget({ type: "resep", item })}
              />
            </TabsContent>
            <TabsContent value="pengaturan">
              <SettingsTab
                status={status}
                parameter={parameter}
                parameterDraft={parameterDraft}
                saving={saving}
                apiBaseUrl={API_BASE_URL}
                onDraftChange={setParameterDraft}
                onSave={saveParameter}
                onReload={() => setReloadOpen(true)}
              />
            </TabsContent>
          </Tabs>
        </main>

        <BahanSheet
          open={bahanSheetOpen}
          saving={saving}
          editing={editingBahan}
          form={bahanForm}
          error={formError}
          onOpenChange={setBahanSheetOpen}
          onChange={setBahanForm}
          onSubmit={submitBahan}
        />
        <ResepSheet
          open={resepSheetOpen}
          saving={saving}
          editing={editingResep}
          form={resepForm}
          bahan={bahan}
          error={formError}
          onOpenChange={setResepSheetOpen}
          onChange={setResepForm}
          onSubmit={submitResep}
        />
        <DeleteDialog target={deleteTarget} resep={resep} saving={saving} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
        <ReloadDialog open={reloadOpen} saving={saving} onOpenChange={setReloadOpen} onConfirm={reloadData} />
        <Toaster toast={toast} onOpenChange={(open) => !open && setToast(null)} />
      </div>
    </TooltipProvider>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Card className="fact-card">
      <CardContent className="p-4">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ResultTab({
  loading,
  optimizing,
  optimization,
  productionRows,
  totalProduction,
  resultExplanation
}: {
  loading: boolean;
  optimizing: boolean;
  optimization: OptimizationResult | null;
  productionRows: Array<{ produk: string; nama: string; jumlah: number; biaya: number; harga: number; profit: number }>;
  totalProduction: number;
  resultExplanation: string;
}) {
  const chartData = productionRows.map((item) => ({ name: item.nama, jumlah: item.jumlah }));
  const producedRows = productionRows.filter((item) => item.jumlah > 0);

  return (
    <section className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="result-panel border-b px-5 py-5 text-foreground">
              <p className="text-sm font-semibold opacity-90">Keputusan produksi optimal</p>
              {loading && !optimization ? (
                <Skeleton className="mt-4 h-16 w-64 bg-white/25" />
              ) : (
                <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
                  <strong className="display-serif text-6xl font-bold leading-none">{formatNumber(totalProduction)}</strong>
                  <span className="pb-1 text-base font-semibold">unit produksi total</span>
                </div>
              )}
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              <Metric label="Status solver" value={optimization?.status ?? "-"} />
              <Metric label="Profit maksimum" value={formatCurrency(optimization?.profit_maksimum)} />
              <Metric label="Produk diproduksi" value={formatNumber(producedRows.length)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interpretasi hasil</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !optimization ? (
              <SkeletonStack />
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">{resultExplanation}</p>
            )}
            <div className="mt-4 grid gap-2">
              {producedRows.length ? (
                producedRows.map((item) => (
                  <div key={item.produk} className="flex items-center justify-between rounded-md border p-3">
                    <span className="font-semibold">{item.nama}</span>
                    <strong>{formatNumber(item.jumlah)} unit</strong>
                  </div>
                ))
              ) : (
                <EmptyState text={optimizing ? "Solver sedang berjalan." : "Belum ada rekomendasi produksi positif."} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Grafik jumlah produksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {loading && !optimization ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -20, right: 8, top: 8, bottom: 38 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={58} tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip formatter={(value) => [`${formatNumber(Number(value))} unit`, "Produksi"]} />
                    <Bar dataKey="jumlah" fill="oklch(var(--accent))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <ProductTable rows={productionRows} />
      </div>
    </section>
  );
}

function ProductTable({
  rows
}: {
  rows: Array<{ produk: string; nama: string; jumlah: number; biaya: number; harga: number; profit: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ringkasan produk</CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="stacked-table table-accent">
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead className="text-right">Produksi</TableHead>
              <TableHead className="text-right">Biaya</TableHead>
              <TableHead className="text-right">Harga jual</TableHead>
              <TableHead className="text-right">Profit/unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.produk}>
                <TableCell data-label="Produk" className="font-semibold">{item.nama}</TableCell>
                <TableCell data-label="Produksi" className="text-right">{formatNumber(item.jumlah)}</TableCell>
                <TableCell data-label="Biaya" className="text-right">{formatCurrency(item.biaya)}</TableCell>
                <TableCell data-label="Harga jual" className="text-right">{formatCurrency(item.harga)}</TableCell>
                <TableCell data-label="Profit/unit" className="text-right">{formatCurrency(item.profit)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ModelTab({
  loading,
  optimization,
  model
}: {
  loading: boolean;
  optimization: OptimizationResult | null;
  model: ReturnType<typeof buildOrModel>;
}) {
  return (
    <section className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Proses solver yang ditampilkan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          {["Data dimuat", "Model dibentuk", "Solver dijalankan", "Solusi optimal ditemukan"].map((step, index) => (
            <div key={step} className="process-card rounded-lg border p-4">
              <Badge variant={optimization || index < 3 ? "success" : "muted"}>{index + 1}</Badge>
              <p className="mt-3 font-semibold">{step}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {index === 2 ? "Backend menggunakan solver library." : "Ditampilkan dari data backend aktif."}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Variabel keputusan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {loading ? (
              <SkeletonStack />
            ) : model.variables.length ? (
              model.variables.map((item) => (
                <div key={item.symbol} className="flex items-center justify-between rounded-md border p-3">
                  <code className="font-mono text-sm font-bold">{item.symbol}</code>
                  <span className="text-sm text-muted-foreground">jumlah {titleCase(item.product)}</span>
                  <strong>{formatNumber(item.value)} unit</strong>
                </div>
              ))
            ) : (
              <EmptyState text="Variabel belum tersedia." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fungsi tujuan</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !optimization ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <pre className="equation-block">{model.objective}</pre>
            )}
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Koefisien diambil dari profit per produk. Model memilih kombinasi produksi yang memaksimalkan total profit.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batasan bahan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="stacked-table table-accent">
            <TableHeader>
              <TableRow>
                <TableHead>Bahan</TableHead>
                <TableHead>Constraint</TableHead>
                <TableHead className="text-right">Batas stok</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {model.constraints.map((constraint) => (
                <TableRow key={constraint.bahan}>
                  <TableCell data-label="Bahan" className="font-semibold">{titleCase(constraint.bahan)}</TableCell>
                  <TableCell data-label="Constraint">
                    <code className="rounded bg-muted px-2 py-1 text-sm">
                      {constraint.expression} &lt;= {formatNumber(constraint.rhsGram)} gram
                    </code>
                  </TableCell>
                  <TableCell data-label="Batas stok" className="text-right">{formatNumber(constraint.rhsGram)} gram</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

function AnalysisTab({ loading, usageRows }: { loading: boolean; usageRows: ReturnType<typeof computeIngredientUsage> }) {
  const binding = usageRows.filter((item) => item.isBinding || item.percentage >= 99.5);

  return (
    <section className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan bahan pembatas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonStack />
          ) : binding.length ? (
            <div className="flex flex-wrap gap-2">
              {binding.map((item) => (
                <Badge key={item.bahan} variant="destructive">
                  {titleCase(item.bahan)} terpakai {formatNumber(item.percentage, 1)}%
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Tidak ada bahan yang tepat habis dari hasil optimasi saat ini.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pemakaian stok</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="stacked-table table-accent">
            <TableHeader>
              <TableRow>
                <TableHead>Bahan</TableHead>
                <TableHead className="text-right">Terpakai</TableHead>
                <TableHead className="text-right">Tersedia</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageRows.map((item) => (
                <TableRow key={item.bahan}>
                  <TableCell data-label="Bahan" className="font-semibold">{titleCase(item.bahan)}</TableCell>
                  <TableCell data-label="Terpakai" className="text-right">{formatNumber(item.usedGram, 1)} gram</TableCell>
                  <TableCell data-label="Tersedia" className="text-right">{formatNumber(item.stockGram, 1)} gram</TableCell>
                  <TableCell data-label="Sisa" className="text-right">{formatNumber(item.remainingGram, 1)} gram</TableCell>
                  <TableCell data-label="Status">
                    <UsageStatus usage={item} />
                  </TableCell>
                </TableRow>
              ))}
              {!usageRows.length ? <EmptyRow colSpan={5} text="Pemakaian bahan belum tersedia." /> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

function BahanTab({
  bahan,
  resep,
  loading,
  saving,
  onCreate,
  onEdit,
  onDelete
}: {
  bahan: Bahan[];
  resep: Resep[];
  loading: boolean;
  saving: boolean;
  onCreate: () => void;
  onEdit: (item: Bahan) => void;
  onDelete: (item: Bahan) => void;
}) {
  return (
    <DataSection
      title="Data Bahan"
      description={`${bahan.length} bahan aktif. Stok disimpan dalam kg dan ditampilkan sebagai gram di model OR.`}
      action={<Button onClick={onCreate} disabled={loading || saving}><Plus className="h-4 w-4" />Tambah bahan</Button>}
    >
      <Table className="stacked-table table-accent">
        <TableHeader>
          <TableRow>
            <TableHead>Nama bahan</TableHead>
            <TableHead className="text-right">Harga/kg</TableHead>
            <TableHead className="text-right">Stok kg</TableHead>
            <TableHead>Dipakai resep</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bahan.map((item) => {
            const usedCount = resep.filter((line) => line.bahan === item.nama_bahan).length;
            return (
              <TableRow key={item.nama_bahan}>
                <TableCell data-label="Nama bahan" className="font-semibold">{titleCase(item.nama_bahan)}</TableCell>
                <TableCell data-label="Harga/kg" className="text-right">{formatCurrency(item.harga)}</TableCell>
                <TableCell data-label="Stok kg" className="text-right">{formatNumber(item.stok, 2)}</TableCell>
                <TableCell data-label="Dipakai resep">
                  <Badge variant={usedCount ? "secondary" : "muted"}>{usedCount} baris</Badge>
                </TableCell>
                <TableCell data-label="Aksi" className="text-right">
                  <RowActions disabled={saving} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
                </TableCell>
              </TableRow>
            );
          })}
          {!bahan.length ? <EmptyRow colSpan={5} text="Belum ada bahan." /> : null}
        </TableBody>
      </Table>
    </DataSection>
  );
}

function ResepTab({
  bahan,
  resep,
  allResep,
  loading,
  saving,
  filter,
  productOptions,
  onFilterChange,
  onCreate,
  onEdit,
  onDelete
}: {
  bahan: Bahan[];
  resep: Resep[];
  allResep: Resep[];
  loading: boolean;
  saving: boolean;
  filter: string;
  productOptions: string[];
  onFilterChange: (value: string) => void;
  onCreate: () => void;
  onEdit: (item: Resep) => void;
  onDelete: (item: Resep) => void;
}) {
  const [view, setView] = useState<"produk" | "matriks" | "detail">("produk");
  const hargaByBahan = useMemo(
    () => new Map(bahan.map((item) => [item.nama_bahan, item.harga])),
    [bahan]
  );
  const groupedRecipes = useMemo(() => {
    const groups = new Map<string, Resep[]>();
    for (const item of resep) {
      groups.set(item.produk, [...(groups.get(item.produk) ?? []), item]);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([produk, items]) => {
        const sortedItems = [...items].sort((a, b) => b.jumlah_gram - a.jumlah_gram || a.bahan.localeCompare(b.bahan));
        const totalGram = sortedItems.reduce((sum, item) => sum + item.jumlah_gram, 0);
        const estimatedCost = sortedItems.reduce(
          (sum, item) => sum + (item.jumlah_gram / 1000) * (hargaByBahan.get(item.bahan) ?? 0),
          0
        );

        return {
          produk,
          items: sortedItems,
          totalGram,
          estimatedCost,
          maxGram: Math.max(...sortedItems.map((item) => item.jumlah_gram), 0)
        };
      });
  }, [hargaByBahan, resep]);
  const matrixProducts = groupedRecipes.map((group) => group.produk);
  const matrixIngredients = useMemo(
    () => [...new Set(resep.map((item) => item.bahan))].sort((a, b) => a.localeCompare(b)),
    [resep]
  );
  const recipeValueByCell = useMemo(
    () => new Map(resep.map((item) => [`${item.bahan}::${item.produk}`, item.jumlah_gram])),
    [resep]
  );
  const averageGram = groupedRecipes.length
    ? groupedRecipes.reduce((sum, group) => sum + group.totalGram, 0) / groupedRecipes.length
    : 0;

  return (
    <DataSection
      title="Data Resep"
      description={`${allResep.length} baris resep aktif. Jumlah bahan disimpan dalam gram per unit produk.`}
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={filter} onValueChange={onFilterChange}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Filter produk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua produk</SelectItem>
              {productOptions.map((produk) => (
                <SelectItem key={produk} value={produk}>{titleCase(produk)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={onCreate} disabled={loading || saving || !bahan.length}>
            <Plus className="h-4 w-4" />
            Tambah resep
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <RecipeStat label="Produk tampil" value={formatNumber(groupedRecipes.length)} />
          <RecipeStat label="Baris resep tampil" value={formatNumber(resep.length)} />
          <RecipeStat label="Rata-rata gram/unit" value={`${formatNumber(averageGram, 1)} gram`} />
        </div>

        <div className="flex w-full flex-col gap-2 rounded-lg border bg-card p-1 sm:w-fit sm:flex-row" aria-label="Mode tampilan resep">
          <RecipeViewButton active={view === "produk"} onClick={() => setView("produk")}>
            Per Produk
          </RecipeViewButton>
          <RecipeViewButton active={view === "matriks"} onClick={() => setView("matriks")}>
            Matriks
          </RecipeViewButton>
          <RecipeViewButton active={view === "detail"} onClick={() => setView("detail")}>
            Detail Baris
          </RecipeViewButton>
        </div>

        {view === "produk" ? (
          <RecipeProductView groups={groupedRecipes} saving={saving} onEdit={onEdit} onDelete={onDelete} />
        ) : null}

        {view === "matriks" ? (
          <RecipeMatrixView
            products={matrixProducts}
            ingredients={matrixIngredients}
            valueByCell={recipeValueByCell}
          />
        ) : null}

        {view === "detail" ? (
          <RecipeDetailTable resep={resep} saving={saving} onEdit={onEdit} onDelete={onDelete} />
        ) : null}
      </div>
    </DataSection>
  );
}

function RecipeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function RecipeViewButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`min-h-10 rounded-md px-3 text-sm font-semibold transition-colors ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
      }`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function RecipeProductView({
  groups,
  saving,
  onEdit,
  onDelete
}: {
  groups: Array<{
    produk: string;
    items: Resep[];
    totalGram: number;
    estimatedCost: number;
    maxGram: number;
  }>;
  saving: boolean;
  onEdit: (item: Resep) => void;
  onDelete: (item: Resep) => void;
}) {
  if (!groups.length) {
    return <EmptyState text="Belum ada resep untuk filter ini." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((group) => (
        <div key={group.produk} className="rounded-lg border bg-card p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h3 className="text-base font-bold">{titleCase(group.produk)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatNumber(group.items.length)} bahan, {formatNumber(group.totalGram, 1)} gram per unit
              </p>
            </div>
            <Badge variant="secondary">{formatCurrency(group.estimatedCost)} / unit</Badge>
          </div>

          <div className="mt-4 grid gap-3">
            {group.items.map((item) => {
              const percentage = group.maxGram > 0 ? (item.jumlah_gram / group.maxGram) * 100 : 0;

              return (
                <div key={`${item.produk}-${item.bahan}`} className="rounded-md border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold">{titleCase(item.bahan)}</p>
                        <p className="shrink-0 text-sm font-bold">{formatNumber(item.jumlah_gram, 1)} g</p>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${Math.max(percentage, 6)}%` }}
                        />
                      </div>
                    </div>
                    <RowActions disabled={saving} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function RecipeMatrixView({
  products,
  ingredients,
  valueByCell
}: {
  products: string[];
  ingredients: string[];
  valueByCell: Map<string, number>;
}) {
  if (!products.length || !ingredients.length) {
    return <EmptyState text="Belum ada resep untuk filter ini." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table className="min-w-[720px] table-accent">
        <TableHeader>
          <TableRow>
            <TableHead>Bahan</TableHead>
            {products.map((produk) => (
              <TableHead key={produk} className="text-right">{titleCase(produk)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ingredients.map((bahan) => (
            <TableRow key={bahan}>
              <TableCell className="font-semibold">{titleCase(bahan)}</TableCell>
              {products.map((produk) => {
                const value = valueByCell.get(`${bahan}::${produk}`) ?? 0;
                return (
                  <TableCell key={`${bahan}-${produk}`} className="text-right">
                    {value > 0 ? `${formatNumber(value, 1)} g` : "-"}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RecipeDetailTable({
  resep,
  saving,
  onEdit,
  onDelete
}: {
  resep: Resep[];
  saving: boolean;
  onEdit: (item: Resep) => void;
  onDelete: (item: Resep) => void;
}) {
  return (
    <Table className="stacked-table table-accent">
      <TableHeader>
        <TableRow>
          <TableHead>Produk</TableHead>
          <TableHead>Bahan</TableHead>
          <TableHead className="text-right">Jumlah gram</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {resep.map((item) => (
          <TableRow key={`${item.produk}-${item.bahan}`}>
            <TableCell data-label="Produk" className="font-semibold">{titleCase(item.produk)}</TableCell>
            <TableCell data-label="Bahan">{titleCase(item.bahan)}</TableCell>
            <TableCell data-label="Jumlah gram" className="text-right">{formatNumber(item.jumlah_gram, 2)}</TableCell>
            <TableCell data-label="Aksi" className="text-right">
              <RowActions disabled={saving} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
            </TableCell>
          </TableRow>
        ))}
        {!resep.length ? <EmptyRow colSpan={4} text="Belum ada resep untuk filter ini." /> : null}
      </TableBody>
    </Table>
  );
}

function SettingsTab({
  status,
  parameter,
  parameterDraft,
  saving,
  apiBaseUrl,
  onDraftChange,
  onSave,
  onReload
}: {
  status: DataStatus | null;
  parameter: Parameter[];
  parameterDraft: Record<string, string>;
  saving: boolean;
  apiBaseUrl: string;
  onDraftChange: (draft: Record<string, string>) => void;
  onSave: (item: Parameter) => void;
  onReload: () => void;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Parameter optimasi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="stacked-table table-accent">
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Nilai</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parameter.map((item) => (
                <TableRow key={item.parameter}>
                  <TableCell data-label="Parameter" className="font-semibold">
                    {titleCase(item.parameter)}
                    {item.parameter === "margin" ? (
                      <p className="mt-1 text-xs font-normal text-muted-foreground">Contoh: 0,3 berarti 30%.</p>
                    ) : null}
                  </TableCell>
                  <TableCell data-label="Nilai">
                    <Input
                      value={parameterDraft[item.parameter] ?? ""}
                      onChange={(event) =>
                        onDraftChange({ ...parameterDraft, [item.parameter]: event.target.value })
                      }
                      inputMode="decimal"
                    />
                  </TableCell>
                  <TableCell data-label="Aksi" className="text-right">
                    <Button size="sm" onClick={() => onSave(item)} disabled={saving}>
                      <Save className="h-4 w-4" />
                      Simpan
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!parameter.length ? <EmptyRow colSpan={3} text="Parameter belum tersedia." /> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status backend</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs font-semibold text-muted-foreground">API aktif</p>
            <p className="mt-1 break-all text-sm font-semibold">{apiBaseUrl}</p>
          </div>
          <StatusRow label="Bahan" ready={Boolean(status?.bahan_loaded)} />
          <StatusRow label="Resep" ready={Boolean(status?.resep_loaded)} />
          <StatusRow label="Parameter" ready={Boolean(status?.parameter_loaded)} />
          <Button variant="outline" onClick={onReload} disabled={saving}>
            <RefreshCw className="h-4 w-4" />
            Muat ulang data backend
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

function DataSection({ title, description, action, children }: { title: string; description: string; action: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="section-heading-title text-xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      <Card>
        <CardContent className="p-0 sm:p-2">{children}</CardContent>
      </Card>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card rounded-lg border p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function UsageStatus({ usage }: { usage: ReturnType<typeof computeIngredientUsage>[number] }) {
  if (usage.isBinding || usage.percentage >= 99.5) {
    return <Badge variant="destructive">Pembatas</Badge>;
  }
  if (usage.percentage >= 80) {
    return <Badge variant="warning">Kritis</Badge>;
  }
  if (usage.usedGram === 0) {
    return <Badge variant="muted">Tidak terpakai</Badge>;
  }
  return <Badge variant="success">Aman</Badge>;
}

function RowActions({ disabled, onEdit, onDelete }: { disabled: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onEdit} disabled={disabled} aria-label="Edit data">
            <Edit3 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit data</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onDelete} disabled={disabled} aria-label="Hapus data">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Hapus data</TooltipContent>
      </Tooltip>
    </div>
  );
}

function BahanSheet({
  open,
  saving,
  editing,
  form,
  error,
  onOpenChange,
  onChange,
  onSubmit
}: {
  open: boolean;
  saving: boolean;
  editing: Bahan | null;
  form: BahanForm;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onChange: (form: BahanForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editing ? "Edit bahan" : "Tambah bahan"}</SheetTitle>
          <SheetDescription>Perubahan akan dikirim ke backend dan data optimasi akan dihitung ulang.</SheetDescription>
        </SheetHeader>
        <form className="grid flex-1 gap-4" onSubmit={onSubmit}>
          <Field label="Nama bahan">
            <Input value={form.nama_bahan} onChange={(event) => onChange({ ...form, nama_bahan: event.target.value })} autoFocus />
          </Field>
          <Field label="Harga per kg">
            <Input value={form.harga} onChange={(event) => onChange({ ...form, harga: event.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Stok kg">
            <Input value={form.stok} onChange={(event) => onChange({ ...form, stok: event.target.value })} inputMode="decimal" />
          </Field>
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan perubahan
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ResepSheet({
  open,
  saving,
  editing,
  form,
  bahan,
  error,
  onOpenChange,
  onChange,
  onSubmit
}: {
  open: boolean;
  saving: boolean;
  editing: Resep | null;
  form: ResepForm;
  bahan: Bahan[];
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onChange: (form: ResepForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editing ? "Edit resep" : "Tambah resep"}</SheetTitle>
          <SheetDescription>Jumlah bahan ditulis dalam gram untuk satu unit produk.</SheetDescription>
        </SheetHeader>
        <form className="grid flex-1 gap-4" onSubmit={onSubmit}>
          <Field label="Nama produk">
            <Input value={form.produk} onChange={(event) => onChange({ ...form, produk: event.target.value })} autoFocus />
          </Field>
          <Field label="Bahan">
            <Select value={form.bahan} onValueChange={(value) => onChange({ ...form, bahan: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih bahan" />
              </SelectTrigger>
              <SelectContent>
                {bahan.map((item) => (
                  <SelectItem key={item.nama_bahan} value={item.nama_bahan}>{titleCase(item.nama_bahan)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Jumlah gram">
            <Input value={form.jumlah_gram} onChange={(event) => onChange({ ...form, jumlah_gram: event.target.value })} inputMode="decimal" />
          </Field>
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan perubahan
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function DeleteDialog({
  target,
  resep,
  saving,
  onCancel,
  onConfirm
}: {
  target: DeleteTarget | null;
  resep: Resep[];
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const affectedRecipes =
    target?.type === "bahan" ? resep.filter((item) => item.bahan === target.item.nama_bahan) : [];

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi hapus data</DialogTitle>
          <DialogDescription>
            Data ini akan dihapus melalui API backend. Aksi ini memengaruhi data aktif yang dipakai optimasi.
          </DialogDescription>
        </DialogHeader>
        {target ? (
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-semibold">
              {target.type === "bahan"
                ? titleCase(target.item.nama_bahan)
                : `${titleCase(target.item.produk)} - ${titleCase(target.item.bahan)}`}
            </p>
            {affectedRecipes.length ? (
              <p className="mt-2 text-muted-foreground">
                Bahan ini dipakai di {affectedRecipes.length} baris resep.
              </p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Batal</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Hapus data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReloadDialog({
  open,
  saving,
  onOpenChange,
  onConfirm
}: {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Muat ulang data backend?</DialogTitle>
          <DialogDescription>
            Backend akan membaca ulang data dari Google Sheets, lalu dashboard menjalankan optimasi ulang.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
          <Button onClick={onConfirm} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Muat ulang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="font-semibold">{label}</span>
      <Badge variant={ready ? "success" : "warning"}>{ready ? "Siap" : "Belum siap"}</Badge>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <EmptyState text={text} />
      </TableCell>
    </TableRow>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function SkeletonStack() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-5 w-2/3" />
    </div>
  );
}
