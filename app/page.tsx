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
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);

  const adminEmails = [
    "nicolas@thednvr.com",
    "rg@thednvr.com",
    "yahir@thednvr.com",
  ];

  const isAdmin = adminEmails.includes(
    session?.user?.email || ""
  );

  const [form, setForm] = useState({
    caption: "",
    photographer: "",
    location: "",
    event: "",
    team: "",
    person: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp() {
    alert("Public signups are disabled.");
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

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
    if (!session) {
      alert("You must be logged in");
      return;
    }

    if (files.length === 0) {
      alert("Choose photos first");
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

    setFiles([]);
    setShowUpload(false);

    await loadPhotos();

    setUploading(false);
  }

  async function deletePhoto(id: string, title: string) {
    const typed = prompt(`Type DELETE to remove:\n\n${title}`);

    if (typed !== "DELETE") {
      alert("Delete cancelled");
      return;
    }

    const { error } = await supabase
      .from("photos")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadPhotos();
  }

  async function downloadPhoto(url: string, filename: string) {
    const response = await fetch(url);
    const blob = await response.blob();

    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "photo";

    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(blobUrl);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-neutral-800 p-4 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">
              DNVR Photos
            </h1>

            <p className="mt-2 text-sm text-neutral-400 md:text-base">
              Search, upload, tag, and download community photos.
            </p>
          </div>

          {!session ? (
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2"
              />

              <button
                onClick={signIn}
                className="rounded-lg bg-white px-4 py-2 font-semibold text-black"
              >
                Login
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-neutral-400">
                {session.user.email}
              </p>

              <button
                onClick={signOut}
                className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-black"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3"
            placeholder="Search by team, player, event, location..."
          />

          {search && (
            <button
              onClick={() => setSearch("")}
              className="rounded-lg bg-neutral-800 px-4 py-3"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      <section className="p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">
            {search
              ? `Search Results (${filteredPhotos.length})`
              : "Latest Photos"}
          </h2>

          {session && (
            <button
              onClick={() => setShowUpload(true)}
              className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-black"
            >
              Upload
            </button>
          )}
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
                Upload up to 10 images
              </p>
            </div>

            {files.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="overflow-hidden rounded-lg border border-neutral-800"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-24 w-full object-cover"
                    />

                    <div className="p-2">
                      <p className="truncate text-xs text-neutral-400">
                        {file.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {["caption", "photographer", "location", "event", "team", "person"].map((field) => (
              <input
                key={field}
                className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3"
                placeholder={`${field} optional`}
                value={(form as any)[field]}
                onChange={(e) =>
                  setForm({ ...form, [field]: e.target.value })
                }
              />
            ))}

            <button
              onClick={uploadPhotos}
              disabled={uploading}
              className="rounded-lg bg-white px-5 py-3 font-semibold text-black"
            >
              {uploading ? "Uploading..." : "Upload Photos"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950"
            >
              <button
                onClick={() => setSelectedPhoto(photo)}
                className="w-full overflow-hidden"
              >
                <img
                  src={photo.image_url}
                  alt={photo.title}
                  className="h-48 w-full object-cover transition duration-300 hover:scale-105"
                />
              </button>

              <div className="p-3">
                <p className="truncate font-semibold">
                  {photo.title}
                </p>

                <p className="mt-1 text-xs text-neutral-400">
                  {[photo.team, photo.person, photo.location]
                    .filter(Boolean)
                    .join(" • ")}
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() =>
                      downloadPhoto(photo.image_url, photo.title)
                    }
                    className="rounded bg-white px-3 py-1 text-xs font-semibold text-black"
                  >
                    Download
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() =>
                        deletePhoto(photo.id, photo.title)
                      }
                      className="rounded bg-red-500 px-3 py-1 text-xs font-semibold text-black"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute right-4 top-4 rounded bg-white px-4 py-2 font-semibold text-black"
          >
            Close
          </button>

          <div className="max-h-[95vh] max-w-7xl overflow-auto">
            <img
              src={selectedPhoto.image_url}
              alt={selectedPhoto.title}
              className="max-h-[80vh] w-auto rounded-xl"
            />

            <div className="mt-4 rounded-xl bg-neutral-950 p-4">
              <h2 className="text-2xl font-bold">
                {selectedPhoto.title}
              </h2>

              <p className="mt-2 text-neutral-400">
                {[selectedPhoto.team,
                  selectedPhoto.person,
                  selectedPhoto.location]
                  .filter(Boolean)
                  .join(" • ")}
              </p>

              {selectedPhoto.caption && (
                <p className="mt-4">{selectedPhoto.caption}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() =>
                    downloadPhoto(
                      selectedPhoto.image_url,
                      selectedPhoto.title
                    )
                  }
                  className="rounded-lg bg-white px-4 py-2 font-semibold text-black"
                >
                  Download Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}