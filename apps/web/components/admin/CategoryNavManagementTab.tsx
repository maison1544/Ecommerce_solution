import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_CATEGORY_NAV_LABELS,
  saveCategoryNavLabels,
  type CategoryNavLabel,
  useCategoryNavLabels,
} from "@/hooks/useCategoryNavLabels";

export function CategoryNavManagementTab() {
  const { labels, loading, reload } = useCategoryNavLabels({ includeHidden: true });
  const [draftLabels, setDraftLabels] = useState<CategoryNavLabel[]>(DEFAULT_CATEGORY_NAV_LABELS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftLabels(labels);
  }, [labels]);

  const updateDraft = <Key extends keyof CategoryNavLabel>(
    categoryKey: string,
    field: Key,
    value: CategoryNavLabel[Key]
  ) => {
    setDraftLabels((prev) =>
      prev.map((item) => (item.categoryKey === categoryKey ? { ...item, [field]: value } : item))
    );
  };

  const resetDefaults = () => {
    setDraftLabels(DEFAULT_CATEGORY_NAV_LABELS);
  };

  const saveLabels = async () => {
    const invalid = draftLabels.find((item) => item.label.trim().length === 0);
    if (invalid) {
      toast.error("카테고리 표시명을 입력해주세요");
      return;
    }

    setSaving(true);
    try {
      await saveCategoryNavLabels(draftLabels);
      await reload();
      window.dispatchEvent(new Event("ecommerce-category-nav-labels-updated"));
      toast.success("카테고리 NAV 설정이 저장되었습니다");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "카테고리 NAV 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">카테고리 NAV 관리</h2>
            <p className="mt-1 text-sm text-gray-600">
              URL은 순번 기반 숫자 slug로 노출되고, 상품 분류 로직은 내부 category key로 안전하게 유지됩니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetDefaults}
              className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-bold hover:bg-gray-50"
            >
              <RotateCcw size={16} />
              초기화
            </button>
            <button
              type="button"
              onClick={saveLabels}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded bg-black px-3 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              <Save size={16} />
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-y bg-gray-50 text-left text-sm">
                <th className="px-4 py-3 font-bold">URL slug</th>
                <th className="px-4 py-3 font-bold">표시명</th>
                <th className="px-4 py-3 font-bold">소개글</th>
                <th className="px-4 py-3 font-bold">노출</th>
                <th className="px-4 py-3 font-bold">정렬</th>
                <th className="px-4 py-3 font-bold">주의</th>
              </tr>
            </thead>
            <tbody>
              {draftLabels.map((item) => (
                <tr key={item.slug} className="border-b">
                  <td className="px-4 py-3 font-mono text-xs">{item.slug}</td>
                  <td className="px-4 py-3">
                    <input
                      value={item.label}
                      onChange={(event) => updateDraft(item.categoryKey, "label", event.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                      maxLength={60}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      value={item.description}
                      onChange={(event) => updateDraft(item.categoryKey, "description", event.target.value)}
                      className="min-h-20 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                      maxLength={200}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={item.isVisible}
                      onChange={(event) => updateDraft(item.categoryKey, "isVisible", event.target.checked)}
                      className="size-4"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.sortOrder}
                      onChange={(event) =>
                        updateDraft(item.categoryKey, "sortOrder", Number(event.target.value) || item.sortOrder)
                      }
                      className="w-24 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {item.categoryKey === "special-deals"
                      ? "특가 URL은 순번 slug로 노출하고 내부 특가 상품 로직은 special-deals key로 유지합니다."
                      : "URL slug는 저장 시 정렬 순서에 맞춰 재계산됩니다."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
