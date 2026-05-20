"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../lib/supabase";

type Photo = {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  photographer: string;
  location: string;
  event: string;
  team: string;
  person: string;
};

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    caption: "",
    photographer: "",
    location: "",
    event: "",
    team: "",
    person: "",
  });

  const filteredPhotos = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return photos;

    return photos.filter((photo) =>
      [
        photo.title,
        photo.caption,
        photo.photographer,
        photo.location,
        photo.event,
        photo.team,
        photo.person,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [photos, search]);

  async function loadPhotos() {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setPhotos(data || []);
  }

  useEffect(() => {
    loadPhotos();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    setFiles((current) => [...current, ...imageFiles].slice(0, 10));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 10,
  });

  async function uploadPhotos() {
    if (files.length === 0) {
      alert("Choose at least one photo first");
      return;
    }

    setUploading(true);

    for (const file of files) {
      const filePath = `${Date.now()}-${file.name}`;

      const upload = await supabase.storage
        .from("photos")
        .upload(filePath, file);

      if (upload.error) {
        alert(upload.error.message);
        setUploading(false);
        return;
      }

      const publicUrl = supabase.storage
        .from("photos")
        .getPublicUrl(filePath).data.publicUrl;

      const insert = await supabase.from("photos").insert({
        title: file.name,
        caption: form.caption || "",
        image_url: publicUrl,
        photographer: form.photographer || "",
        location: form.location || "",
        event: form.event || "",
        team: form.team || "",
        person: form.person || "",
      });

      if (insert.error) {
        alert(insert.error.message);
        setUploading(false);
        return;
      }
    }

    alert("Photos uploaded!");

    setShowUpload(false);
    setFiles([]);
    setForm({
      caption: "",
      photographer: "",
      location: "",
      event: "",
      team: "",
      person: "",
    });

    await loadPhotos();
    setUploading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-neutral-800 p-8">
        <h1 className="text-4xl font-bold">DNVR Photos</h1>
        <p className="mt-2 text-neutral-400">
          Search, upload, tag, and download community photos.
        </p>

        <div className="mt-6 flex gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3"
            placeholder="Search by team, person, location, event..."
          />

          {search && (
            <button
              onClick={() => setSearch("")}
              className="rounded-lg bg-neutral-800 px-5 py-3 font-semibold text-white"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      <section className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">
            {search ? `Search Results (${filteredPhotos.length})` : "Latest Photos"}
          </h2>

          <button
            onClick={() => setShowUpload(true)}
            className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-black"
          >
            Upload Photos
          </button>
        </div>

        {showUpload && (
          <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="mb-4 text-xl font-bold">Upload Photos</h3>

            <div
              {...getRootProps()}
              className={`mb-4 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center ${
                isDragActive
                  ? "border-green-400 bg-green-950"
                  : "border-neutral-700 bg-neutral-900"
              }`}
            >
              <input {...getInputProps()} />
              <p className="font-semibold">
                Drag photos here or click to browse
              </p>
              <p className="mt-2 text-sm text-neutral-400">
                Upload up to 10 images at a time
              </p>
            </div>

            {files.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="rounded-lg border border-neutral-800 bg-black p-2"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-24 w-full rounded object-cover"
                    />
                    <p className="mt-2 truncate text-xs text-neutral-400">
                      {file.name}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <input
              className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3"
              placeholder="Caption optional"
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
            />

            <input
              className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3"
              placeholder="Photographer optional"
              value={form.photographer}
              onChange={(e) =>
                setForm({ ...form, photographer: e.target.value })
              }
            />

            <input
              className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3"
              placeholder="Location optional"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />

            <input
              className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3"
              placeholder="Event optional"
              value={form.event}
              onChange={(e) => setForm({ ...form, event: e.target.value })}
            />

            <input
              className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3"
              placeholder="Team optional"
              value={form.team}
              onChange={(e) => setForm({ ...form, team: e.target.value })}
            />

            <input
              className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3"
              placeholder="Person optional"
              value={form.person}
              onChange={(e) => setForm({ ...form, person: e.target.value })}
            />

            <button
              onClick={uploadPhotos}
              disabled={uploading}
              className="rounded-lg bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
            >
              {uploading ? "Uploading..." : `Upload ${files.length || ""} Photos`}
            </button>
          </div>
        )}

        {filteredPhotos.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-10 text-center text-neutral-400">
            No photos found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950"
              >
                <img
                  src={photo.image_url}
                  alt={photo.title}
                  className="h-56 w-full object-cover"
                />

                <div className="p-4">
                  <p className="font-semibold">{photo.title}</p>

                  <p className="text-sm text-neutral-400">
                    {[photo.team, photo.person, photo.location]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>

                  {photo.photographer && (
                    <p className="mt-2 text-xs text-neutral-500">
                      Photographer: {photo.photographer}
                    </p>
                  )}

                  {photo.event && (
                    <p className="text-xs text-neutral-500">
                      Event: {photo.event}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}