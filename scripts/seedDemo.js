const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { connectDatabase } = require("../src/config/database");
const { User } = require("../src/models/User");
const { Form } = require("../src/models/Form");
const { env } = require("../src/config/env");

const demoName = process.env.DEMO_NAME || "Demo Owner";
const demoEmail = (process.env.DEMO_EMAIL || "demo@formflow.dev").toLowerCase();
const demoPassword = process.env.DEMO_PASSWORD || "Passw0rd!";

async function seed() {
  await connectDatabase();

  let user = await User.findOne({ email: demoEmail });
  if (!user) {
    user = await User.create({
      name: demoName,
      email: demoEmail,
      passwordHash: await bcrypt.hash(demoPassword, 10)
    });
  }

  const existingForm = await Form.findOne({ ownerId: user._id, slug: "job-application-form" });
  if (!existingForm) {
    await Form.create({
      slug: "job-application-form",
      title: "Job Application Form",
      ownerId: user._id,
      collaborators: [],
      version: 1,
      theme: {
        preset: "glassmorphism",
        custom_css: ".ff-stage { backdrop-filter: blur(12px); }"
      },
      fields: [
        {
          id: "field_name",
          type: "short_text",
          order: 1,
          label: "Full Name",
          config: { placeholder: "Your full name", max_length: 120 },
          validation: { required: true, error_message: "Name is required" },
          logic: []
        },
        {
          id: "field_email",
          type: "email",
          order: 2,
          label: "Email Address",
          config: { validate_format: true, placeholder: "you@example.com" },
          validation: { required: true, error_message: "Email is required" },
          logic: []
        },
        {
          id: "field_dietary",
          type: "multi_select",
          order: 3,
          label: "Dietary Preference",
          config: {
            options: ["Veg", "Non-Veg", "Vegan"],
            min_select: 1,
            max_select: 2
          },
          validation: { required: true, error_message: "Pick at least one option" },
          logic: [
            {
              condition: { field: "self", op: "in_list", value: ["Veg", "Vegan"] },
              action: { type: "hide", targets: ["field_chicken"] }
            }
          ]
        },
        {
          id: "field_chicken",
          type: "single_select",
          order: 4,
          label: "Chicken Dishes",
          config: {
            options: ["Butter Chicken", "Chicken Curry", "None"],
            display: "dropdown"
          },
          validation: { required: false },
          logic: []
        },
        {
          id: "field_resume",
          type: "file_upload",
          order: 5,
          label: "Resume Upload",
          config: {
            allowed_types: ["application/pdf"],
            max_size_mb: 10,
            cloudinary_folder: "formflow/resumes"
          },
          validation: { required: false },
          logic: []
        }
      ]
    });
  }

  console.log("Demo seed complete");
  console.log(`MongoDB: ${env.MONGODB_URI ? "configured" : "missing MONGODB_URI"}`);
  console.log(`User: ${demoEmail}`);
  console.log(`Password: ${demoPassword}`);

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error("Seed failed", error);
  await mongoose.disconnect();
  process.exit(1);
});
