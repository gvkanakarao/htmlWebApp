const BACKEND_URL = "https://stock-tracker-api-7snp.onrender.com";

document.addEventListener("DOMContentLoaded", async () => {
  // Fetch and populate category dropdowns dynamically from Turso
  let categoryData = {};

  async function loadCategories() {
    try {
      const response = await fetch(`${BACKEND_URL}/dairy/categories`);
      if (response.ok) {
        categoryData = await response.json();
        populateDropdowns();
      }
    } catch (error) {
      console.error("Failed to load categories from backend.");
    }
  }

  const s1Main = document.getElementById("s1-main");
  const s1Sub = document.getElementById("s1-sub");
  const s3Main = document.getElementById("s3-main");
  const s3Sub = document.getElementById("s3-sub");

  function populateDropdowns() {
    // Populate Section 1 Dropdowns
    if (s1Main && s1Sub) {
      s1Main.innerHTML = '<option value="">Select Main</option>';
      Object.keys(categoryData).forEach((mainCat) => {
        const opt = document.createElement("option");
        opt.value = mainCat;
        opt.textContent = mainCat;
        s1Main.appendChild(opt);
      });
      s1Sub.innerHTML = '<option value="">Select Sub</option>';
    }

    // Populate Section 3 Dropdowns
    if (s3Main && s3Sub) {
      s3Main.innerHTML = '<option value="">Select Main</option>';
      Object.keys(categoryData).forEach((mainCat) => {
        const opt = document.createElement("option");
        opt.value = mainCat;
        opt.textContent = mainCat;
        s3Main.appendChild(opt);
      });
      s3Sub.innerHTML = '<option value="">Select Sub</option>';
    }
  }

  // Cascading logic for Section 1
  if (s1Main && s1Sub) {
    s1Main.addEventListener("change", () => {
      const selectedMain = s1Main.value;
      s1Sub.innerHTML = '<option value="">Select Sub</option>';
      if (categoryData[selectedMain]) {
        categoryData[selectedMain].forEach((subCat) => {
          const opt = document.createElement("option");
          opt.value = subCat;
          opt.textContent = subCat;
          s1Sub.appendChild(opt);
        });
      }
    });
  }

  // Cascading logic for Section 3 & auto-loading workspace records
  if (s3Main && s3Sub) {
    s3Main.addEventListener("change", () => {
      const selectedMain = s3Main.value;
      s3Sub.innerHTML = '<option value="">Select Sub</option>';
      if (categoryData[selectedMain]) {
        categoryData[selectedMain].forEach((subCat) => {
          const opt = document.createElement("option");
          opt.value = subCat;
          opt.textContent = subCat;
          s3Sub.appendChild(opt);
        });
      }
    });

    s3Sub.addEventListener("change", async () => {
      const main = s3Main.value;
      const sub = s3Sub.value;
      if (main && sub) {
        try {
          const response = await fetch(
            `${BACKEND_URL}/dairy/records?main=${encodeURIComponent(main)}&sub=${encodeURIComponent(sub)}`,
          );
          if (response.ok) {
            const result = await response.json();
            document.getElementById("workspace-textarea").value =
              result.data || "";
          }
        } catch (error) {
          console.error("Failed to fetch records.");
        }
      }
    });
  }

  loadCategories();

  // 2. Section 1: Submit New Entry
  const s1UpdateBtn = document.getElementById("s1-update-btn");
  if (s1UpdateBtn) {
    s1UpdateBtn.addEventListener("click", async () => {
      const main = s1Main.value;
      const sub = s1Sub.value;
      const textInput = document.getElementById("s1-text-input").value.trim();

      if (!main || !sub || !textInput) {
        alert("Please select Main, Sub, and enter text.");
        return;
      }

      try {
        const response = await fetch(`${BACKEND_URL}/dairy/entry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ main, sub, text_input: textInput }),
        });

        if (response.ok) {
          alert("Entry added successfully!");
          document.getElementById("s1-text-input").value = "";
        } else {
          alert("Failed to add entry.");
        }
      } catch (error) {
        alert("Network error while adding entry.");
      }
    });
  }

  // 3. Section 2: Category Management Toggle & Add
  const toggleCatBtn = document.getElementById("toggle-cat-btn");
  const catRow = document.getElementById("category-hidden-row");

  if (toggleCatBtn && catRow) {
    toggleCatBtn.addEventListener("click", () => {
      catRow.classList.toggle("active");
      if (catRow.classList.contains("active")) {
        toggleCatBtn.textContent = "Cancel";
        toggleCatBtn.style.background = "#dc3545";
      } else {
        toggleCatBtn.textContent = "Add/Cancel Categories";
        toggleCatBtn.style.background = "#333";
      }
    });
  }

  const addCatBtn = document.getElementById("add-cat-btn");
  if (addCatBtn) {
    addCatBtn.addEventListener("click", async () => {
      const newMain = document.getElementById("new-main-input").value.trim();
      const newSub = document.getElementById("new-sub-input").value.trim();

      if (!newMain || !newSub) {
        alert("Please enter both Main and Sub category names.");
        return;
      }

      try {
        const response = await fetch(`${BACKEND_URL}/dairy/category`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ main: newMain, sub: newSub }),
        });

        if (response.ok) {
          alert("Category added successfully!");
          document.getElementById("new-main-input").value = "";
          document.getElementById("new-sub-input").value = "";
          loadCategories();
        } else {
          alert("Failed to add category.");
        }
      } catch (error) {
        alert("Network error while adding category.");
      }
    });
  }

  // 4. Section 4: Workspace Update with Confirmation & Turso Write-Back
  const s4UpdateBtn = document.getElementById("s4-update-btn");
  if (s4UpdateBtn) {
    s4UpdateBtn.addEventListener("click", async () => {
      const main = s3Main.value;
      const sub = s3Sub.value;
      const updatedData = document.getElementById("workspace-textarea").value;

      if (!main || !sub) {
        alert("Please select Main and Sub filter categories first.");
        return;
      }

      const confirmed = window.confirm(
        "Are you sure you want to update these changes to the database?",
      );
      if (confirmed) {
        try {
          const response = await fetch(`${BACKEND_URL}/dairy/records`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ main, sub, text_input: updatedData }),
          });

          if (response.ok) {
            alert("Records updated successfully in Turso!");
          } else {
            alert("Failed to update records.");
          }
        } catch (error) {
          alert("Network error while updating records.");
        }
      }
    });
  }

  // 5. CSV Export Download Button with Confirmation
  const exportCsvBtn = document.getElementById("export-csv-btn");
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", () => {
      const confirmed = window.confirm(
        "Do you want to download the entire database as a .csv file?",
      );
      if (confirmed) {
        window.location.href = `${BACKEND_URL}/dairy/export-csv`;
      }
    });
  }
});
