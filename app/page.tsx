"use client";

import { useEffect, useState } from "react";
import { getProfile } from "@/lib/getProfile";
import GenerateUI from "./components/GenerateUI";


export default function Home() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile().then((profile) => {
      if (!profile) {
        window.location.href = "/login";
        return;
      }

      setProfileId(profile.id);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Laddar…</div>;

  return <GenerateUI profileId={profileId!} />;
}
