import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import api from "../lib/axios";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];

function MatchCard({ item }) {
  const safeItem = item && typeof item === "object" ? item : {};
  const title = typeof safeItem.title === "string" ? safeItem.title : "Untitled item";
  const description = typeof safeItem.description === "string"
    ? safeItem.description
    : "No description provided.";
  const typeClass = safeItem.type === "LOST"
    ? "bg-amber-100 text-amber-800"
    : "bg-emerald-100 text-emerald-800";

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {typeof safeItem.imageUrl === "string" && safeItem.imageUrl.trim() && (
        <img alt={title} className="h-52 w-full object-cover" src={safeItem.imageUrl} />
      )}
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Possible Match</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          {safeItem.type && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeClass}`}>
              {safeItem.type}
            </span>
          )}
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          {typeof safeItem.category === "string" && (
            <div><dt className="font-medium text-slate-800">Category</dt><dd>{safeItem.category}</dd></div>
          )}
          {typeof safeItem.location === "string" && (
            <div><dt className="font-medium text-slate-800">Location</dt><dd>{safeItem.location}</dd></div>
          )}
          {typeof safeItem.status === "string" && (
            <div><dt className="font-medium text-slate-800">Status</dt><dd>{safeItem.status}</dd></div>
          )}
        </dl>
      </div>
    </article>
  );
}

function FindMatchPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [items, setItems] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleImageChange(event) {
    const selectedImage = event.target.files?.[0] || null;
    setError("");
    setItems([]);
    setHasSearched(false);

    if (!selectedImage) {
      setImage(null);
      setPreviewUrl("");
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(selectedImage.type)) {
      setImage(null);
      setPreviewUrl("");
      event.target.value = "";
      setError("Please choose a JPEG or PNG image.");
      return;
    }
    if (selectedImage.size > MAX_IMAGE_BYTES) {
      setImage(null);
      setPreviewUrl("");
      event.target.value = "";
      setError("Image must be 5 MB or smaller.");
      return;
    }
    setImage(selectedImage);
    setPreviewUrl(URL.createObjectURL(selectedImage));
  }

  function removeImage() {
    setImage(null);
    setPreviewUrl("");
    setItems([]);
    setHasSearched(false);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!image || isLoading) {
      if (!image) setError("Select a JPEG or PNG image before finding matches.");
      return;
    }

    setError("");
    setItems([]);
    setHasSearched(true);
    setIsLoading(true);
    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await api.post("/items/search/image?limit=5", formData);
      const responseItems = response?.data?.items;
      if (!Array.isArray(responseItems)) throw new Error("Unexpected image search response");
      setItems(responseItems);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      setItems([]);
      setError(requestError.response?.data?.message || "Image search is unavailable right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Find a match</h1>
        <p className="mt-2 text-slate-600">Upload a photo to find visually similar lost or found items.</p>
        <form className="mt-6" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700" htmlFor="match-image">Image</label>
          <input
            accept="image/jpeg,image/png"
            className="mt-2 block w-full text-sm text-slate-600"
            id="match-image"
            onChange={handleImageChange}
            ref={fileInputRef}
            type="file"
          />
          <p className="mt-2 text-xs text-slate-500">JPEG or PNG, up to 5 MB.</p>

          {previewUrl && (
            <div className="mt-5 max-w-md">
              <img alt="Selected image preview" className="max-h-80 w-full rounded-lg object-contain" src={previewUrl} />
              <button className="mt-3 rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700" onClick={removeImage} type="button">
                Remove image
              </button>
            </div>
          )}

          {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button className="mt-6 rounded bg-slate-900 px-5 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading || !image} type="submit">
            {isLoading ? "Finding matches..." : "Find matches"}
          </button>
        </form>
      </section>

      {isLoading && <p className="mt-8 text-center text-slate-600" role="status">Searching for possible matches...</p>}
      {!isLoading && hasSearched && !error && items.length === 0 && (
        <p className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-600">No possible matches found. Try another image.</p>
      )}
      {!isLoading && items.length > 0 && (
        <section aria-label="Possible image matches" className="mt-8 grid gap-5 md:grid-cols-2">
          {items.map((item, index) => <MatchCard item={item} key={item?._id || `image-match-${index}`} />)}
        </section>
      )}
    </main>
  );
}

export default FindMatchPage;
