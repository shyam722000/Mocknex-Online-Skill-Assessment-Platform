// app/lib/api.js

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://nexlearn.noviindusdemosites.in";

export const getHeaders = () => {
  let token = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("access_token");
  }

  const baseHeaders = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (!token) return baseHeaders;

  return {
    ...baseHeaders,
    Authorization: `Bearer ${token}`,
  };
};

export const apiPostForm = async (endpoint, body) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: getHeaders(),
      body: new URLSearchParams(body).toString(),
    });

    const data = await response.json();
    return data; 
  } catch (error) {
    console.error("API POST request failed:", error);
    throw error;
  }
};

export const apiGet = async (endpoint) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: getHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API GET request failed:", error);
    throw error;
  }
};



export const apiPostsignup = async (endpoint, formData) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: getHeaders().Authorization,
      },
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API POST Multipart request failed:", error);
    throw error;
  }
};
