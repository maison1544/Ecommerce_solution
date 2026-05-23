import { useCallback, useEffect, useMemo, useState } from "react";
import { categoryList } from "@/data/categories";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type CategoryNavLabel = {
  slug: string;
  categoryKey: string;
  label: string;
  description: string;
  sortOrder: number;
  isVisible: boolean;
};

type CategoryNavLabelRow = {
  slug: string;
  category_key: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  digital: "최신 디지털 기기와 가전제품을 만나보세요",
  fashion: "트렌디한 의류와 신발, 액세서리",
  food: "신선하고 건강한 식품",
  beauty: "프리미엄 뷰티 & 스킨케어",
  living: "편리한 생활을 위한 필수 용품",
  baby: "아이를 위한 안전한 제품",
  sports: "건강한 라이프스타일을 위한 운동용품",
  car: "안전하고 편리한 드라이빙",
  books: "베스트셀러와 스테디셀러",
  toys: "재미있는 장난감과 취미용품",
  office: "업무 효율을 높이는 문구류",
  pet: "반려동물을 위한 모든 것",
  "special-deals": "최대 50%까지 절찬 진행 중인 상품을 만나보세요!",
};

export const DEFAULT_CATEGORY_NAV_LABELS: CategoryNavLabel[] = categoryList.map((category, index) => ({
  slug: String(index + 1),
  categoryKey: category.value,
  label: category.value === "special-deals" ? "특가할인상품" : category.label,
  description: CATEGORY_DESCRIPTIONS[category.value] || "다양한 상품을 만나보세요",
  sortOrder: (index + 1) * 10,
  isVisible: true,
}));

function normalizeRows(rows: Array<Partial<CategoryNavLabel>> | null | undefined, includeHidden = false) {
  const byCategoryKey = new Map(
    (rows || [])
      .filter((row): row is CategoryNavLabel => Boolean(row.slug && row.categoryKey && row.label))
      .map((row) => [
        row.categoryKey,
        {
          slug: row.slug,
          categoryKey: row.categoryKey,
          label: row.label,
          description: row.description || CATEGORY_DESCRIPTIONS[row.categoryKey] || "다양한 상품을 만나보세요",
          sortOrder: Number(row.sortOrder ?? 0),
          isVisible: row.isVisible !== false,
        },
      ])
  );

  return DEFAULT_CATEGORY_NAV_LABELS.map((fallback) => byCategoryKey.get(fallback.categoryKey) || fallback)
    .filter((item) => includeHidden || item.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCategoryNavFallbackLabel(slug: string) {
  return DEFAULT_CATEGORY_NAV_LABELS.find((category) => category.slug === slug || category.categoryKey === slug)?.label || slug;
}

export function getCategoryNavFallback(slugOrCategoryKey: string) {
  return DEFAULT_CATEGORY_NAV_LABELS.find(
    (category) => category.slug === slugOrCategoryKey || category.categoryKey === slugOrCategoryKey
  );
}

export function useCategoryNavLabels(options?: { includeHidden?: boolean }) {
  const includeHidden = options?.includeHidden === true;
  const [labels, setLabels] = useState<CategoryNavLabel[]>(DEFAULT_CATEGORY_NAV_LABELS);
  const [loading, setLoading] = useState(false);

  const loadLabels = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLabels(DEFAULT_CATEGORY_NAV_LABELS);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("category_nav_labels")
        .select("slug, category_key, label, description, sort_order, is_visible")
        .order("sort_order", { ascending: true });

      if (error) {
        setLabels(DEFAULT_CATEGORY_NAV_LABELS);
        return;
      }

      setLabels(
        normalizeRows(
          ((data || []) as CategoryNavLabelRow[]).map((item) => ({
            slug: item.slug,
            categoryKey: item.category_key,
            label: item.label,
            description: item.description || CATEGORY_DESCRIPTIONS[item.category_key] || "다양한 상품을 만나보세요",
            sortOrder: item.sort_order,
            isVisible: item.is_visible,
          })),
          includeHidden
        )
      );
    } finally {
      setLoading(false);
    }
  }, [includeHidden]);

  useEffect(() => {
    void loadLabels();
  }, [loadLabels]);

  const labelMap = useMemo(
    () => Object.fromEntries(labels.map((item) => [item.slug, item.label])) as Record<string, string>,
    [labels]
  );

  const resolveCategory = useCallback(
    (slugOrCategoryKey: string) =>
      labels.find(
        (item) => item.slug === slugOrCategoryKey || item.categoryKey === slugOrCategoryKey
      ) || getCategoryNavFallback(slugOrCategoryKey),
    [labels]
  );

  const getCategoryLabel = useCallback(
    (categoryKey: string) => resolveCategory(categoryKey)?.label || getCategoryNavFallbackLabel(categoryKey),
    [resolveCategory]
  );

  const getCategoryDescription = useCallback(
    (categoryKey: string) =>
      resolveCategory(categoryKey)?.description ||
      CATEGORY_DESCRIPTIONS[categoryKey] ||
      "다양한 상품을 만나보세요",
    [resolveCategory]
  );

  return {
    labels,
    labelMap,
    loading,
    reload: loadLabels,
    resolveCategory,
    getCategoryLabel,
    getCategoryDescription,
  };
}

export async function saveCategoryNavLabels(labels: CategoryNavLabel[]) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 설정이 필요합니다");
  }

  const supabase = createClient("admin");

  const normalizedLabels = [...labels]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item, index) => ({
      ...item,
      slug: String(index + 1),
      sortOrder: (index + 1) * 10,
    }));

  const tempUpdates = normalizedLabels.map((item, index) =>
    supabase
      .from("category_nav_labels")
      .update({ slug: String(1000 + index + 1) })
      .eq("category_key", item.categoryKey)
  );

  const tempResults = await Promise.all(tempUpdates);
  const tempError = tempResults.find((result) => result.error)?.error;
  if (tempError) throw tempError;

  const { error } = await supabase.from("category_nav_labels").upsert(
    normalizedLabels.map((item) => ({
      slug: item.slug,
      category_key: item.categoryKey,
      label: item.label.trim(),
      description: item.description.trim(),
      sort_order: item.sortOrder,
      is_visible: item.isVisible,
    })),
    { onConflict: "category_key" }
  );

  if (error) throw error;
}
