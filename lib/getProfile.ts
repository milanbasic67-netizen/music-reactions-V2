import { supabase }
from "./supabase";

export async function getProfile() {

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {

    return null;

  }

  const {
    data,
    error,
  } =
    await supabase

      .from("profiles")

      .select("*")

      .eq("id", user.id)

      .single();

  console.log(
    data
  );

  console.log(
    error
  );

  return data;

}