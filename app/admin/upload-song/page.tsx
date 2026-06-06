async function importYoutube() {
  try {
    if (!youtubeUrl) return alert("Unesite YouTube URL");
    setLoading(true);

    // 1. Pozivamo backend da skine video
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import-youtube`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: youtubeUrl }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.details || "Import failed");

    // 2. Dobijamo trenutnog korisnika
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Login required");

    // 3. Upisujemo pesmu u bazu 'songs' sa podacima koje je backend vratio
    const { error: insertError } = await supabase
      .from("songs")
      .insert({
        title: data.title,
        artist: data.artist,
        video_url: data.videoUrl,
        thumbnail_url: data.thumbnailUrl,
        uploaded_by: profile?.username || "Admin",
        user_id: user.id,
      });

    if (insertError) throw insertError;

    alert("Pesma uspešno uvezena!");
    window.location.href = "/songs";

  } catch (err: any) {
    alert("Greška: " + err.message);
  } finally {
    setLoading(false);
  }
}