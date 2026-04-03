const baseUrl = process.env.SMOKE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function main() {
  const health = await request("/health");
  console.log("Health OK:", health);

  const email = `smoke-${Date.now()}@formflow.dev`;
  const password = "Passw0rd!";

  const register = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke User",
      email,
      password
    })
  });
  console.log("Register OK:", register.user.email);

  const token = register.token;

  const created = await request("/api/forms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: "Smoke Test Form",
      fields: [
        {
          id: "field_email",
          type: "email",
          order: 1,
          label: "Email",
          config: { validate_format: true },
          validation: { required: true }
        }
      ],
      theme: {
        preset: "minimal",
        custom_css: ""
      }
    })
  });
  console.log("Create form OK:", created.form.slug);

  const publicForm = await request(`/api/public/forms/${created.form.slug}`);
  console.log("Public fetch OK:", publicForm.form.title);

  const submitted = await request(`/api/public/forms/${created.form.slug}/submit`, {
    method: "POST",
    body: JSON.stringify({
      answers: {
        field_email: email
      }
    })
  });
  console.log("Submit OK:", submitted.response._id);

  const responses = await request(`/api/forms/${created.form._id}/responses`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  console.log("Responses OK:", responses.responses.length);

  console.log("Smoke test passed");
}

main().catch((error) => {
  console.error("Smoke test failed");
  console.error(error.message);
  process.exit(1);
});
