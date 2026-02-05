async function generate() {
  try {
    setLoading(true);

    const res = await fetch("/api/generate", {
      method: "POST",
    });

    const data = await res.json();
    setResult(data.result || "Inget svar");
  } catch (err) {
    setResult("Något gick fel i API-anropet");
  } finally {
    setLoading(false);
  }
}
