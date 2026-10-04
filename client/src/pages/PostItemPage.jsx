import { useRef, useState } from "react";
import api from "../lib/axios";

const initialForm = {
  title: "",
  description: "",
  category: "",
  type: "LOST",
  location: "",
  verificationQuestion: "",
};

function PostItemPage() {
  const [form, setForm] = useState(initialForm);
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const imageInputRef = useRef(null);

  function updateField(event) {
    setForm((currentForm) => ({ ...currentForm, [event.target.name]: event.target.value }));
  }

  function handleImageChange(event) {
    setImage(event.target.files?.[0] || null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const requiredFields = [form.title, form.description, form.category, form.type, form.location];
    if (requiredFields.some((field) => !field.trim())) {
      setError("Title, description, category, type, and location are required.");
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([field, value]) => {
      if (value.trim() || field !== "verificationQuestion") {
        formData.append(field, value);
      }
    });
    if (image) {
      formData.append("image", image);
    }

    setIsLoading(true);

    try {
      await api.post("/items", formData);
      setForm(initialForm);
      setImage(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
      setSuccess("Item posted successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to post item. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <form className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-slate-900">Post an item</h1>
        <p className="mt-2 text-sm text-slate-600">Share details about a lost or found item.</p>
        {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {success && <p className="mt-4 rounded bg-green-50 p-3 text-sm text-green-700" role="status">{success}</p>}

        <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="item-title">Title</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" id="item-title" name="title" onChange={updateField} value={form.title} />

        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="item-description">Description</label>
        <textarea className="mt-1 w-full rounded border border-slate-300 px-3 py-2" id="item-description" name="description" onChange={updateField} rows="4" value={form.description} />

        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="item-category">Category</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" id="item-category" name="category" onChange={updateField} value={form.category} />

        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="item-type">Type</label>
        <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" id="item-type" name="type" onChange={updateField} value={form.type}>
          <option value="LOST">Lost</option>
          <option value="FOUND">Found</option>
        </select>

        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="item-location">Location</label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" id="item-location" name="location" onChange={updateField} value={form.location} />

        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="item-verification-question">Verification question <span className="font-normal text-slate-500">(optional)</span></label>
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" id="item-verification-question" name="verificationQuestion" onChange={updateField} value={form.verificationQuestion} />

        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="item-image">Image <span className="font-normal text-slate-500">(optional)</span></label>
        <input accept="image/*" className="mt-1 block w-full text-sm text-slate-600" id="item-image" onChange={handleImageChange} ref={imageInputRef} type="file" />

        <button className="mt-6 w-full rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} type="submit">
          {isLoading ? "Posting item..." : "Post item"}
        </button>
      </form>
    </main>
  );
}

export default PostItemPage;
