import ProductImageManager from "@/components/admin/ProductImageManager";

export default function ProductImagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Ürün Görsel Yönetimi
        </h1>

        <p className="mt-2 text-slate-600">
          Ürün görsellerini toplu olarak yükleyebilir ve ürünlerle eşleştirebilirsiniz.
        </p>
      </div>

      <ProductImageManager />
    </div>
  );
}