import { FormEvent, ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Edit,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  Utensils,
  X
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
import { Alert, AlertDescription } from "./components/ui/alert";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Skeleton } from "./components/ui/skeleton";
import { Table } from "./components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { api, normalizeApiError } from "./lib/api";
import { computeIngredientUsage } from "./lib/calculations";
import { formatCurrency, formatDate, formatNumber, toTitleCase } from "./lib/format";
import type {
  Bahan,
  BahanInput,
  DataStatus,
  OptimizationResult,
  Parameter,
  Resep,
  ResepInput,
  TabKey
} from "./types";

type BahanFormState = {
  nama_bahan: string;
  harga: string;
  stok: string;
};

type ResepFormState = {
  produk: string;
  bahan: string;
  jumlah_gram: string;
};

type ParameterDraft = Record<string, string>;

type DeleteTarget =
  | { type: "bahan"; item: Bahan }
  | { type: "resep"; item: Resep };

type ToastState = {
  message: string;
  tone: "success" | "error";
} | null;

const tabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  { key: "optimasi", label: "Optimasi", icon: <BarChart3 size={18} /> },
  { key: "bahan", label: "Bahan", icon: <Package size={18} /> },
  { key: "resep", label: "Resep", icon: <Utensils size={18} /> },
  { key: "parameter", label: "Parameter", icon: <Settings size={18} /> }
];

const emptyBahanForm: BahanFormState = {
  nama_bahan: "",
  harga: "",
  stok: ""
};

const emptyResepForm: ResepFormState = {
  produk: "",
  bahan: "",
  jumlah_gram: ""
};

function toApiKey(value: string): string {
  return value.trim().toLowerCase();
}

function parseNumberField(value: string): number {
  return Number(value.replace(",", "."));
}

function validateBahan(form: BahanFormState): BahanInput {
  const nama_bahan = toApiKey(form.nama_bahan);
  const harga = parseNumberField(form.harga);
  const stok = parseNumberField(form.stok);

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

function validateResep(form: ResepFormState): ResepInput {
  const produk = toApiKey(form.produk);
  const bahan = toApiKey(form.bahan);
  const jumlah_gram = parseNumberField(form.jumlah_gram);

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

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("optimasi");
  const [status, setStatus] = useState<DataStatus | null>(null);
  const [bahan, setBahan] = useState<Bahan[]>([]);
  const [resep, setResep] = useState<Resep[]>([]);
  const [parameter, setParameter] = useState<Parameter[]>([]);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [bahanModalOpen, setBahanModalOpen] = useState(false);
  const [resepModalOpen, setResepModalOpen] = useState(false);
  const [editingBahan, setEditingBahan] = useState<Bahan | null>(null);
  const [editingResep, setEditingResep] = useState<Resep | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [bahanForm, setBahanForm] = useState<BahanFormState>(emptyBahanForm);
  const [resepForm, setResepForm] = useState<ResepFormState>(emptyResepForm);
  const [parameterDraft, setParameterDraft] = useState<ParameterDraft>({});
  const [productFilter, setProductFilter] = useState("semua");

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
    setParameterDraft(
      Object.fromEntries(nextParameter.map((item) => [item.parameter, String(item.nilai)]))
    );
  }

  async function runOptimization() {
    setOptimizing(true);
    setOptimizationError(null);

    try {
      const result = await api.optimize();
      setOptimization(result);
    } catch (error) {
      setOptimization(null);
      setOptimizationError(normalizeApiError(error));
    } finally {
      setOptimizing(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    setGlobalError(null);

    try {
      await loadReferenceData();
      await runOptimization();
    } catch (error) {
      setGlobalError(normalizeApiError(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const margin = useMemo(
    () => parameter.find((item) => item.parameter === "margin")?.nilai ?? 0,
    [parameter]
  );

  const productionRows = useMemo(() => {
    const production = optimization?.jumlah_produksi_optimal ?? {};

    return Object.entries(production)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([produk, jumlah]) => ({
        produk,
        nama: toTitleCase(produk),
        jumlah,
        biaya: optimization?.biaya_produk[produk] ?? 0,
        harga: optimization?.harga_produk_bulat[produk] ?? 0,
        profit: optimization?.profit_per_produk[produk] ?? 0
      }));
  }, [optimization]);

  const totalProduksi = productionRows.reduce((total, item) => total + item.jumlah, 0);

  const usageRows = useMemo(
    () =>
      computeIngredientUsage(resep, bahan, optimization?.jumlah_produksi_optimal ?? {}).sort(
        (a, b) => b.persentase - a.persentase || a.bahan.localeCompare(b.bahan)
      ),
    [bahan, optimization, resep]
  );

  const usedIngredientNames = useMemo(
    () => new Set(resep.map((item) => item.bahan)),
    [resep]
  );

  const productOptions = useMemo(
    () => [...new Set(resep.map((item) => item.produk))].sort((a, b) => a.localeCompare(b)),
    [resep]
  );

  const filteredResep = useMemo(() => {
    if (productFilter === "semua") {
      return resep;
    }

    return resep.filter((item) => item.produk === productFilter);
  }, [productFilter, resep]);

  function showToast(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
  }

  function openCreateBahan() {
    setEditingBahan(null);
    setBahanForm(emptyBahanForm);
    setFormError(null);
    setBahanModalOpen(true);
  }

  function openEditBahan(item: Bahan) {
    setEditingBahan(item);
    setBahanForm({
      nama_bahan: item.nama_bahan,
      harga: String(item.harga),
      stok: String(item.stok)
    });
    setFormError(null);
    setBahanModalOpen(true);
  }

  async function submitBahan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const payload = validateBahan(bahanForm);
      if (editingBahan) {
        await api.updateBahan(editingBahan.nama_bahan, payload);
        showToast("Bahan disimpan.");
      } else {
        await api.createBahan(payload);
        showToast("Bahan ditambahkan.");
      }

      setBahanModalOpen(false);
      await loadReferenceData();
      await runOptimization();
    } catch (error) {
      setFormError(normalizeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function deleteBahan(item: Bahan) {
    setSaving(true);
    setGlobalError(null);

    try {
      await api.deleteBahan(item.nama_bahan);
      await loadReferenceData();
      await runOptimization();
      showToast("Bahan dihapus.");
    } catch (error) {
      setGlobalError(normalizeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  function openCreateResep() {
    setEditingResep(null);
    setResepForm({
      ...emptyResepForm,
      bahan: bahan[0]?.nama_bahan ?? ""
    });
    setFormError(null);
    setResepModalOpen(true);
  }

  function openEditResep(item: Resep) {
    setEditingResep(item);
    setResepForm({
      produk: item.produk,
      bahan: item.bahan,
      jumlah_gram: String(item.jumlah_gram)
    });
    setFormError(null);
    setResepModalOpen(true);
  }

  async function submitResep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const payload = validateResep(resepForm);
      if (editingResep) {
        await api.updateResep(editingResep.produk, editingResep.bahan, payload);
        showToast("Resep disimpan.");
      } else {
        await api.createResep(payload);
        showToast("Resep ditambahkan.");
      }

      setResepModalOpen(false);
      await loadReferenceData();
      await runOptimization();
    } catch (error) {
      setFormError(normalizeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function deleteResep(item: Resep) {
    setSaving(true);
    setGlobalError(null);

    try {
      await api.deleteResep(item.produk, item.bahan);
      await loadReferenceData();
      await runOptimization();
      showToast("Resep dihapus.");
    } catch (error) {
      setGlobalError(normalizeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const target = deleteTarget;
    setDeleteTarget(null);

    if (target.type === "bahan") {
      await deleteBahan(target.item);
    } else {
      await deleteResep(target.item);
    }
  }

  async function saveParameter(item: Parameter) {
    const value = parseNumberField(parameterDraft[item.parameter] ?? String(item.nilai));
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
      await loadReferenceData();
      await runOptimization();
      showToast("Parameter disimpan.");
    } catch (error) {
      setGlobalError(normalizeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function reloadData() {
    setLoading(true);
    setGlobalError(null);

    try {
      await api.reloadData();
      await loadReferenceData();
      await runOptimization();
      showToast("Data dimuat ulang.");
    } catch (error) {
      setGlobalError(normalizeApiError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Dashboard Perhitungan</p>
          <h1>Optimasi Produksi Bakery</h1>
        </div>
        <div className="topbar-actions">
          <StatusPill status={status} error={globalError} />
          <Button className="header-reload" variant="subtle" size="sm" onClick={reloadData} disabled={loading || saving}>
            <RefreshCw size={17} className={loading ? "spin" : ""} />
            Muat ulang data
          </Button>
        </div>
      </header>

      <main className="workspace">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
          <TabsList className="dashboard-tabs" aria-label="Navigasi dashboard">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="dashboard-tab">
                {tab.icon}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <section className="data-strip" aria-label="Data aktif">
          <DataFact label="Update terakhir" value={formatDate(status?.last_update)} />
          <DataFact label="Total produk" value={String(status?.total_produk ?? "-")} />
          <DataFact label="Total bahan" value={String(status?.total_bahan ?? "-")} />
          <DataFact label="Margin" value={`${formatNumber(margin * 100, 1)}%`} />
        </section>

        {globalError ? (
          <Alert variant="destructive" className="mt-4 flex items-center gap-3">
            <CircleAlert size={18} />
            <AlertDescription>{globalError}</AlertDescription>
          </Alert>
        ) : null}

        {activeTab === "optimasi" ? (
          <OptimizationTab
            dataStatus={status}
            loading={loading}
            optimizing={optimizing}
            optimization={optimization}
            optimizationError={optimizationError}
            productionRows={productionRows}
            totalProduksi={totalProduksi}
            usageRows={usageRows}
            onRun={runOptimization}
          />
        ) : null}

        {activeTab === "bahan" ? (
          <BahanTab
            bahan={bahan}
            saving={saving}
            usedIngredientNames={usedIngredientNames}
            onCreate={openCreateBahan}
            onEdit={openEditBahan}
            onDelete={(item) => setDeleteTarget({ type: "bahan", item })}
            loading={loading}
          />
        ) : null}

        {activeTab === "resep" ? (
          <ResepTab
            bahan={bahan}
            resep={filteredResep}
            productFilter={productFilter}
            productOptions={productOptions}
            saving={saving}
            onCreate={openCreateResep}
            onEdit={openEditResep}
            onDelete={(item) => setDeleteTarget({ type: "resep", item })}
            onFilterChange={setProductFilter}
            loading={loading}
          />
        ) : null}

        {activeTab === "parameter" ? (
          <ParameterTab
            parameter={parameter}
            parameterDraft={parameterDraft}
            saving={saving}
            onDraftChange={setParameterDraft}
            onSave={saveParameter}
          />
        ) : null}
      </main>

      <Modal
        open={bahanModalOpen}
        title={editingBahan ? "Edit Bahan" : "Tambah Bahan"}
        onClose={() => setBahanModalOpen(false)}
      >
        <form className="form" onSubmit={submitBahan}>
          <Field label="Nama bahan">
            <Input
              value={bahanForm.nama_bahan}
              onChange={(event) =>
                setBahanForm((current) => ({ ...current, nama_bahan: event.target.value }))
              }
              autoFocus
            />
          </Field>
          <Field label="Harga per kg">
            <Input
              value={bahanForm.harga}
              onChange={(event) =>
                setBahanForm((current) => ({ ...current, harga: event.target.value }))
              }
              inputMode="decimal"
            />
          </Field>
          <Field label="Stok kg">
            <Input
              value={bahanForm.stok}
              onChange={(event) =>
                setBahanForm((current) => ({ ...current, stok: event.target.value }))
              }
              inputMode="decimal"
            />
          </Field>
          <FormFooter error={formError} saving={saving} />
        </form>
      </Modal>

      <Modal
        open={resepModalOpen}
        title={editingResep ? "Edit Resep" : "Tambah Resep"}
        onClose={() => setResepModalOpen(false)}
      >
        <form className="form" onSubmit={submitResep}>
          <Field label="Produk">
            <Input
              value={resepForm.produk}
              onChange={(event) =>
                setResepForm((current) => ({ ...current, produk: event.target.value }))
              }
              autoFocus
            />
          </Field>
          <Field label="Bahan">
            <Select
              value={resepForm.bahan}
              onValueChange={(value) => setResepForm((current) => ({ ...current, bahan: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih bahan" />
              </SelectTrigger>
              <SelectContent>
                {bahan.map((item) => (
                  <SelectItem key={item.nama_bahan} value={item.nama_bahan}>
                    {toTitleCase(item.nama_bahan)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Jumlah gram">
            <Input
              value={resepForm.jumlah_gram}
              onChange={(event) =>
                setResepForm((current) => ({ ...current, jumlah_gram: event.target.value }))
              }
              inputMode="decimal"
            />
          </Field>
          <FormFooter error={formError} saving={saving} />
        </form>
      </Modal>

      <DeleteDialog
        target={deleteTarget}
        resep={resep}
        saving={saving}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
      <Toast toast={toast} />
    </div>
  );
}

function StatusPill({ status, error }: { status: DataStatus | null; error: string | null }) {
  const loaded = status?.bahan_loaded && status.resep_loaded && status.parameter_loaded;

  if (error) {
    return (
      <Badge variant="destructive" className="status-badge">
        <CircleAlert size={16} />
        Backend bermasalah
      </Badge>
    );
  }

  return (
    <Badge variant={loaded ? "success" : "warning"} className="status-badge">
      {loaded ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
      {loaded ? "Data siap" : "Data belum lengkap"}
    </Badge>
  );
}

function DataFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function OptimizationTab({
  dataStatus,
  loading,
  optimizing,
  optimization,
  optimizationError,
  productionRows,
  totalProduksi,
  usageRows,
  onRun
}: {
  dataStatus: DataStatus | null;
  loading: boolean;
  optimizing: boolean;
  optimization: OptimizationResult | null;
  optimizationError: string | null;
  productionRows: Array<{
    produk: string;
    nama: string;
    jumlah: number;
    biaya: number;
    harga: number;
    profit: number;
  }>;
  totalProduksi: number;
  usageRows: ReturnType<typeof computeIngredientUsage>;
  onRun: () => Promise<void>;
}) {
  return (
    <section className="content-grid">
      <div className="section-heading">
        <div>
          <h2>Keputusan Produksi</h2>
          <p>Status perhitungan: {optimization?.status ?? "-"}</p>
        </div>
        <Button onClick={() => void onRun()} disabled={loading || optimizing}>
          {optimizing ? <Loader2 size={17} className="spin" /> : <BarChart3 size={17} />}
          Jalankan optimasi
        </Button>
      </div>

      {optimizationError ? (
        <Alert variant="destructive" className="flex items-center gap-3">
          <CircleAlert size={18} />
          <AlertDescription>{optimizationError}</AlertDescription>
        </Alert>
      ) : null}

      <DecisionSummary
        optimization={optimization}
        productionRows={productionRows}
        totalProduksi={totalProduksi}
        dataStatus={dataStatus}
        loading={loading}
      />

      <div className="section-subheading">
        <h3>Bukti Perhitungan</h3>
        <p>Grafik dan tabel berikut menunjukkan jumlah produksi tiap produk dari hasil solver.</p>
      </div>

      <div className="split">
        <Card className="panel">
          <CardHeader className="panel-header">
            <CardTitle>Produksi Optimal</CardTitle>
          </CardHeader>
          <div className="chart-box">
            {loading && !optimization ? (
              <SkeletonBlock />
            ) : productionRows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionRows}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nama" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip formatter={(value) => [`${value} unit`, "Produksi"]} />
                  <Bar dataKey="jumlah" fill="var(--blue)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Belum ada hasil optimasi. Jalankan optimasi untuk melihat rekomendasi produksi." />
            )}
          </div>
        </Card>

        <Card className="panel">
          <CardHeader className="panel-header">
            <CardTitle>Ringkasan Produk</CardTitle>
          </CardHeader>
          <DataTable>
            <thead>
              <tr>
                <th>Produk</th>
                <th className="numeric">Jumlah</th>
                <th className="numeric">Biaya</th>
                <th className="numeric">Harga</th>
                <th className="numeric">Profit</th>
              </tr>
            </thead>
            <tbody>
              {productionRows.map((item) => (
                <tr key={item.produk}>
                  <td data-label="Produk">{item.nama}</td>
                  <td data-label="Jumlah" className="numeric">{item.jumlah}</td>
                  <td data-label="Biaya" className="numeric">{formatCurrency(item.biaya)}</td>
                  <td data-label="Harga" className="numeric">{formatCurrency(item.harga)}</td>
                  <td data-label="Profit" className="numeric">{formatCurrency(item.profit)}</td>
                </tr>
              ))}
              {!productionRows.length ? (
                <EmptyRow colSpan={5} text="Belum ada hasil produk untuk ditampilkan." />
              ) : null}
            </tbody>
          </DataTable>
        </Card>
      </div>

      <div className="section-subheading">
        <h3>Detail Pemakaian Bahan</h3>
        <p>Bagian ini membantu membaca alasan ringkas dan dampak hasil terhadap stok bahan.</p>
      </div>

      <div className="detail-split">
        <ExplanationPanel
          optimization={optimization}
          productionRows={productionRows}
          usageRows={usageRows}
          loading={loading}
        />

        <Card className="panel usage-panel">
          <CardHeader className="panel-header">
            <CardTitle>Pemakaian Bahan</CardTitle>
          </CardHeader>
          <DataTable>
            <thead>
              <tr>
                <th>Bahan</th>
                <th className="numeric">Stok kg</th>
                <th className="numeric">Terpakai kg</th>
                <th className="numeric">Sisa kg</th>
                <th>Pemakaian</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {usageRows.map((item) => (
                <tr key={item.bahan}>
                  <td data-label="Bahan">{toTitleCase(item.bahan)}</td>
                  <td data-label="Stok kg" className="numeric">{formatNumber(item.stok)}</td>
                  <td data-label="Terpakai kg" className="numeric">{formatNumber(item.terpakai)}</td>
                  <td data-label="Sisa kg" className="numeric">{formatNumber(item.sisa)}</td>
                  <td data-label="Pemakaian">
                    <div className="usage">
                      <span style={{ width: `${item.persentase}%` }} />
                    </div>
                    <small>{formatNumber(item.persentase, 1)}%</small>
                  </td>
                  <td data-label="Status">
                    <UsageBadge percentage={item.persentase} stock={item.stok} used={item.terpakai} />
                  </td>
                </tr>
              ))}
              {!usageRows.length ? (
                <EmptyRow colSpan={6} text="Data pemakaian bahan belum tersedia." />
              ) : null}
            </tbody>
          </DataTable>
        </Card>
      </div>
    </section>
  );
}

function BahanTab({
  bahan,
  saving,
  loading,
  usedIngredientNames,
  onCreate,
  onEdit,
  onDelete
}: {
  bahan: Bahan[];
  saving: boolean;
  loading: boolean;
  usedIngredientNames: ReadonlySet<string>;
  onCreate: () => void;
  onEdit: (item: Bahan) => void;
  onDelete: (item: Bahan) => void;
}) {
  return (
    <section className="content-grid">
      <div className="section-heading">
        <div>
          <h2>Data Bahan</h2>
          <p>{loading ? "Memuat data bahan" : `${bahan.length} bahan`}</p>
        </div>
        <Button onClick={onCreate} disabled={saving || loading}>
          <Plus size={17} />
          Tambah bahan
        </Button>
      </div>

      <Card className="panel">
        <DataTable>
          <thead>
            <tr>
              <th>Nama bahan</th>
              <th className="numeric">Stok kg</th>
              <th className="numeric">Harga per kg</th>
              <th>Update</th>
              <th className="actions-col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {bahan.map((item) => (
              <tr key={item.nama_bahan}>
                <td data-label="Nama bahan">
                  <span className="name-stack">
                    {toTitleCase(item.nama_bahan)}
                    {!usedIngredientNames.has(item.nama_bahan) ? (
                      <Badge variant="muted">Tidak dipakai</Badge>
                    ) : null}
                  </span>
                </td>
                <td data-label="Stok kg" className="numeric">{formatNumber(item.stok)}</td>
                <td data-label="Harga per kg" className="numeric">{formatCurrency(item.harga)}</td>
                <td data-label="Update">{formatDate(item.updated_at)}</td>
                <td data-label="Aksi">
                  <RowActions
                    disabled={saving}
                    onEdit={() => onEdit(item)}
                    onDelete={() => void onDelete(item)}
                  />
                </td>
              </tr>
            ))}
            {!bahan.length ? (
              <EmptyRow colSpan={5} text="Belum ada bahan yang bisa ditampilkan." />
            ) : null}
          </tbody>
        </DataTable>
      </Card>
    </section>
  );
}

function ResepTab({
  bahan,
  resep,
  productFilter,
  productOptions,
  saving,
  loading,
  onCreate,
  onEdit,
  onDelete,
  onFilterChange
}: {
  bahan: Bahan[];
  resep: Resep[];
  productFilter: string;
  productOptions: string[];
  saving: boolean;
  loading: boolean;
  onCreate: () => void;
  onEdit: (item: Resep) => void;
  onDelete: (item: Resep) => void;
  onFilterChange: (value: string) => void;
}) {
  return (
    <section className="content-grid">
      <div className="section-heading">
        <div>
          <h2>Data Resep</h2>
          <p>{loading ? "Memuat data resep" : `${resep.length} baris resep`}</p>
        </div>
        <div className="inline-actions">
          <Select value={productFilter} onValueChange={onFilterChange}>
            <SelectTrigger className="filter-select">
              <SelectValue placeholder="Semua produk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua produk</SelectItem>
            {productOptions.map((produk) => (
              <SelectItem key={produk} value={produk}>
                {toTitleCase(produk)}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>
          <Button onClick={onCreate} disabled={!bahan.length || saving || loading}>
            <Plus size={17} />
            Tambah resep
          </Button>
        </div>
      </div>

      <Card className="panel">
        <DataTable>
          <thead>
            <tr>
              <th>Produk</th>
              <th>Bahan</th>
              <th className="numeric">Jumlah gram</th>
              <th>Update</th>
              <th className="actions-col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {resep.map((item) => (
              <tr key={`${item.produk}-${item.bahan}`}>
                <td data-label="Produk">{toTitleCase(item.produk)}</td>
                <td data-label="Bahan">{toTitleCase(item.bahan)}</td>
                <td data-label="Jumlah gram" className="numeric">{formatNumber(item.jumlah_gram)}</td>
                <td data-label="Update">{formatDate(item.updated_at)}</td>
                <td data-label="Aksi">
                  <RowActions
                    disabled={saving}
                    onEdit={() => onEdit(item)}
                    onDelete={() => void onDelete(item)}
                  />
                </td>
              </tr>
            ))}
            {!resep.length ? (
              <EmptyRow colSpan={5} text="Belum ada resep untuk filter ini." />
            ) : null}
          </tbody>
        </DataTable>
      </Card>
    </section>
  );
}

function ParameterTab({
  parameter,
  parameterDraft,
  saving,
  onDraftChange,
  onSave
}: {
  parameter: Parameter[];
  parameterDraft: ParameterDraft;
  saving: boolean;
  onDraftChange: (draft: ParameterDraft) => void;
  onSave: (item: Parameter) => Promise<void>;
}) {
  return (
    <section className="content-grid">
      <div className="section-heading">
        <div>
          <h2>Parameter</h2>
          <p>{parameter.length} parameter. Ubah nilai lalu simpan baris yang ingin diperbarui.</p>
        </div>
      </div>

      <Card className="panel">
        <DataTable>
          <thead>
            <tr>
              <th>Parameter</th>
              <th className="numeric">Nilai</th>
              <th className="actions-col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {parameter.map((item) => (
              <tr key={item.parameter}>
                <td data-label="Parameter">
                  <span className="name-stack parameter-name">
                    {toTitleCase(item.parameter)}
                    {item.parameter === "margin" ? (
                      <small>Desimal, contoh 0.2 untuk 20%.</small>
                    ) : null}
                  </span>
                </td>
                <td data-label="Nilai" className="numeric">
                  <Input
                    className="table-input"
                    value={parameterDraft[item.parameter] ?? ""}
                    onChange={(event) =>
                      onDraftChange({
                        ...parameterDraft,
                        [item.parameter]: event.target.value
                      })
                    }
                    inputMode="decimal"
                    aria-label={`Nilai ${toTitleCase(item.parameter)}`}
                  />
                </td>
                <td data-label="Aksi">
                  <Button variant="ghost" size="icon" onClick={() => void onSave(item)} disabled={saving} aria-label={`Simpan ${toTitleCase(item.parameter)}`}>
                    <Save size={16} />
                  </Button>
                </td>
              </tr>
            ))}
            {!parameter.length ? (
              <EmptyRow colSpan={3} text="Parameter belum tersedia." />
            ) : null}
          </tbody>
        </DataTable>
      </Card>
    </section>
  );
}

function DecisionSummary({
  optimization,
  productionRows,
  totalProduksi,
  dataStatus,
  loading
}: {
  optimization: OptimizationResult | null;
  productionRows: Array<{
    produk: string;
    nama: string;
    jumlah: number;
    biaya: number;
    harga: number;
    profit: number;
  }>;
  totalProduksi: number;
  dataStatus: DataStatus | null;
  loading: boolean;
}) {
  const recommendedRows = productionRows.filter((item) => item.jumlah > 0);
  const zeroProduction = productionRows.filter((item) => item.jumlah === 0);

  return (
    <Card className="decision-summary">
      <div className="decision-copy">
        <Badge variant="secondary" className="decision-label">Hasil utama</Badge>
        {loading && !optimization ? (
          <Skeleton className="h-14 w-72 max-w-full" />
        ) : recommendedRows.length ? (
          <div className="decision-total">
            <strong>{formatNumber(totalProduksi, 0)}</strong>
            <span>unit produksi optimal</span>
          </div>
        ) : (
          <h3>Belum ada rekomendasi produksi</h3>
        )}
        <p>
          {optimization
            ? "Rekomendasi dihitung dari stok bahan, resep, harga, dan margin yang sedang aktif."
            : "Hasil akan muncul setelah data dari backend berhasil dimuat."}
        </p>
        <p className="result-freshness">
          Dihitung dari data terakhir: {formatDate(dataStatus?.last_update)}.
        </p>
      </div>
      <div className="result-summary" aria-label="Ringkasan hasil optimasi">
        {loading && !optimization ? (
          <SkeletonBlock />
        ) : optimization ? (
          <>
            <div className="result-facts">
              <div className="result-fact">
                <span>Status perhitungan</span>
                <strong>{optimization.status}</strong>
              </div>
              <div className="result-fact">
                <span>Profit maksimum</span>
                <strong>{formatCurrency(optimization.profit_maksimum)}</strong>
              </div>
              <div className="result-fact">
                <span>Produk diproduksi</span>
                <strong>{recommendedRows.length}</strong>
              </div>
              <div className="result-fact">
                <span>Produk tidak diproduksi</span>
                <strong>{zeroProduction.length}</strong>
              </div>
            </div>
            {recommendedRows.length ? (
              <div className="produced-list" aria-label="Produk yang diproduksi">
                {recommendedRows.map((item) => (
                  <div className="produced-item" key={item.produk}>
                    <span>{item.nama}</span>
                    <strong>{formatNumber(item.jumlah, 0)} unit</strong>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState text="Tidak ada produk dengan jumlah produksi di atas nol." />
        )}
      </div>
    </Card>
  );
}

function ExplanationPanel({
  optimization,
  productionRows,
  usageRows,
  loading
}: {
  optimization: OptimizationResult | null;
  productionRows: Array<{
    produk: string;
    nama: string;
    jumlah: number;
    biaya: number;
    harga: number;
    profit: number;
  }>;
  usageRows: ReturnType<typeof computeIngredientUsage>;
  loading: boolean;
}) {
  const limitingIngredients = usageRows.filter((item) => item.terpakai > 0).slice(0, 3);
  const bestProfitProduct = productionRows
    .filter((item) => item.jumlah > 0)
    .sort((a, b) => b.profit - a.profit)[0];
  const zeroProduction = productionRows.filter((item) => item.jumlah === 0);

  return (
    <Card className="panel explanation-panel">
      <div>
        <h3>Interpretasi singkat</h3>
        <p>
          {loading && !optimization
            ? "Analisis akan muncul setelah hasil optimasi dimuat."
            : optimization
              ? "Ringkasan pembacaan dari hasil dan pemakaian bahan."
              : "Belum ada hasil yang bisa dijelaskan."}
        </p>
      </div>
      <div className="explanation-grid">
        <div className="explanation-item">
          <Badge variant="warning">Bahan pembatas</Badge>
          <strong>
            {limitingIngredients.length
              ? limitingIngredients.map((item) => toTitleCase(item.bahan)).join(", ")
              : "-"}
          </strong>
          <small>Pemakaian stok tertinggi.</small>
        </div>
        <div className="explanation-item">
          <Badge variant="secondary">Profit/unit tertinggi</Badge>
          <strong>{bestProfitProduct ? bestProfitProduct.nama : "-"}</strong>
          <small>
            {bestProfitProduct ? `${formatCurrency(bestProfitProduct.profit)} per unit` : "Belum tersedia"}
          </small>
        </div>
        <div className="explanation-item">
          <Badge variant="muted">Produk tidak diproduksi</Badge>
          <strong>{zeroProduction.length ? zeroProduction.map((item) => item.nama).join(", ") : "-"}</strong>
          <small>Valid sebagai hasil optimal, bukan error.</small>
        </div>
      </div>
    </Card>
  );
}

function UsageBadge({ percentage, stock, used }: { percentage: number; stock: number; used: number }) {
  if (stock === 0 && used === 0) {
    return <Badge variant="muted">Tidak tersedia</Badge>;
  }

  if (percentage >= 80) {
    return <Badge variant="destructive">Bahan kritis</Badge>;
  }

  if (percentage >= 50) {
    return <Badge variant="warning">Perlu dipantau</Badge>;
  }

  if (used === 0) {
    return <Badge variant="muted">Tidak terpakai</Badge>;
  }

  return <Badge variant="success">Aman</Badge>;
}

function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="table-wrap">
      <Table>{children}</Table>
    </div>
  );
}

function RowActions({
  disabled,
  onEdit,
  onDelete
}: {
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="row-actions">
      <TooltipProvider delayDuration={180}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onEdit} disabled={disabled} aria-label="Edit">
              <Edit size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit data</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="text-destructive hover:text-destructive"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              disabled={disabled}
              aria-label="Hapus"
            >
              <Trash2 size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Hapus data</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="table-empty">{text}</div>
      </td>
    </tr>
  );
}

function getFocusableElements(container: HTMLElement) {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => !element.hasAttribute("disabled") && element.getClientRects().length > 0
  );
}

function useDialogFocus(active: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!dialog) {
      return undefined;
    }

    window.setTimeout(() => {
      const focusTarget =
        dialog.querySelector<HTMLElement>("[autofocus]") ??
        getFocusableElements(dialog)[0] ??
        dialog;
      focusTarget.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialogRef.current) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(dialogRef.current);

      if (!focusableElements.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [active]);

  return dialogRef;
}

function SkeletonBlock() {
  return (
    <div className="skeleton-block" aria-hidden="true">
      <Skeleton className="h-11 w-3/4" />
      <Skeleton className="h-11 w-1/2" />
      <Skeleton className="h-11 w-2/3" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function FormFooter({ error, saving }: { error: string | null; saving: boolean }) {
  return (
    <div className="form-footer">
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 size={17} className="spin" /> : <Save size={17} />}
        Simpan perubahan
      </Button>
    </div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useDialogFocus(open, onClose);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup">
            <X size={16} />
          </Button>
        </div>
        {children}
      </div>
    </div>
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
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useDialogFocus(Boolean(target), onCancel);

  if (!target) {
    return null;
  }

  const title =
    target.type === "bahan"
      ? `Hapus ${toTitleCase(target.item.nama_bahan)}?`
      : `Hapus ${toTitleCase(target.item.produk)} - ${toTitleCase(target.item.bahan)}?`;

  const description =
    target.type === "bahan"
      ? "Bahan akan dihapus dari data backend dan Google Sheets melalui API."
      : "Baris resep ini akan dihapus dari data backend dan Google Sheets melalui API.";
  const affectedRecipes =
    target.type === "bahan"
      ? resep.filter((item) => item.bahan === target.item.nama_bahan)
      : [];

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        ref={dialogRef}
        className="modal danger-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Tutup">
            <X size={16} />
          </Button>
        </div>
        <p id={descriptionId} className="dialog-copy">{description}</p>
        {target.type === "bahan" ? (
          <div className="impact-note">
            <strong>Dampak resep</strong>
            <span>
              {affectedRecipes.length
                ? `Dipakai di ${affectedRecipes.length} baris resep: ${[
                    ...new Set(affectedRecipes.map((item) => toTitleCase(item.produk)))
                  ].join(", ")}.`
                : "Tidak dipakai di resep mana pun."}
            </span>
          </div>
        ) : (
          <div className="impact-note">
            <strong>Dampak resep</strong>
            <span>
              Menghapus bahan {toTitleCase(target.item.bahan)} dari produk{" "}
              {toTitleCase(target.item.produk)}.
            </span>
          </div>
        )}
        <div className="dialog-actions">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Batal
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={saving}>
            {saving ? <Loader2 size={17} className="spin" /> : <Trash2 size={17} />}
            Hapus data
          </Button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) {
    return null;
  }

  return (
    <div className={`toast ${toast.tone}`} role="status" aria-live="polite">
      {toast.tone === "success" ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
      {toast.message}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

export default App;
