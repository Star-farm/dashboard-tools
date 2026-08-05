"""Tkinter interface for merging and enriching simulation CSV files."""

import tkinter as tk
from datetime import datetime
from tkinter import filedialog, messagebox, ttk
from processor import DataProcessor


class AppInterface:
    def __init__(self, window):
        self.window = window
        self.window.title("GAMA CSV Merge Tool")
        self.window.geometry("1100x750")
        self.processor = DataProcessor()
        self.file_paths = []
        self.result = None
        self._build_interface()

    def _build_interface(self):
        toolbar = tk.Frame(self.window, pady=10, bg="#f8f9fa")
        toolbar.pack(fill=tk.X)
        tk.Button(toolbar, text="Add CSV files", command=self._select_files).pack(side=tk.LEFT, padx=10)
        tk.Button(toolbar, text="Clear", command=self._clear).pack(side=tk.LEFT, padx=5)
        tk.Button(toolbar, text="Merge and enrich", bg="#3498db", fg="white", command=self._merge).pack(side=tk.LEFT, padx=20)
        tk.Button(toolbar, text="Export CSV", bg="#2ecc71", fg="white", command=self._save).pack(side=tk.LEFT, padx=5)
        self.status = tk.Label(toolbar, text="Selected: 0 files", bg="#f8f9fa", font=("Arial", 10, "bold"))
        self.status.pack(side=tk.RIGHT, padx=20)

        table_frame = tk.Frame(self.window)
        table_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        self.tree = ttk.Treeview(table_frame, show="headings")
        vertical = tk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        horizontal = tk.Scrollbar(table_frame, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=vertical.set, xscrollcommand=horizontal.set)
        vertical.pack(side=tk.RIGHT, fill=tk.Y)
        horizontal.pack(side=tk.BOTTOM, fill=tk.X)
        self.tree.pack(fill=tk.BOTH, expand=True)

        self.log = tk.Text(self.window, height=5, bg="#f4f6f7", state=tk.DISABLED, font=("Consolas", 10))
        self.log.pack(fill=tk.X, padx=10, pady=(0, 10))
        self._write_log("Ready. Select one or more simulation CSV files.")

    def _select_files(self):
        selected = filedialog.askopenfilenames(title="Select CSV files", filetypes=[("CSV files", "*.csv")])
        for path in selected:
            if path not in self.file_paths:
                self.file_paths.append(path)
        self.status.config(text=f"Selected: {len(self.file_paths)} files")

    def _clear(self):
        self.file_paths.clear()
        self.result = None
        self.tree.delete(*self.tree.get_children())
        self.status.config(text="Selected: 0 files")
        self._write_log("Selection cleared.")

    def _merge(self):
        try:
            self.result = self.processor.process_and_merge(self.file_paths)
        except Exception as error:
            messagebox.showerror("Cannot merge files", str(error))
            self._write_log(f"Error: {error}")
            return
        self._show_preview()
        self._write_log(f"Merged {len(self.file_paths)} files into {len(self.result)} rows.")
        if self.processor.last_missing_columns:
            details = []
            for path, columns in self.processor.last_missing_columns.items():
                details.append(f"{path}\n  Missing: {', '.join(columns)}")
            message = "Missing columns were left blank:\n\n" + "\n\n".join(details)
            self._write_log("Warning: some template columns were missing and left blank.")
            messagebox.showwarning("Missing template columns", message)

    def _save(self):
        if self.result is None:
            messagebox.showwarning("No output", "Merge the selected files before exporting.")
            return
        path = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV files", "*.csv")])
        if path:
            self.result.to_csv(path, index=False, encoding="utf-8-sig")
            self._write_log(f"Exported: {path}")
            messagebox.showinfo("Export complete", "The merged CSV file was saved successfully.")

    def _show_preview(self):
        self.tree.delete(*self.tree.get_children())
        columns = list(self.result.columns)
        self.tree["columns"] = columns
        for column in columns:
            self.tree.heading(column, text=column)
            self.tree.column(column, width=150, stretch=False, minwidth=100)
        for row in self.result.head(1000).itertuples(index=False, name=None):
            self.tree.insert("", tk.END, values=["" if value is None else str(value) for value in row])

    def _write_log(self, message):
        self.log.config(state=tk.NORMAL)
        self.log.insert(tk.END, f"[{datetime.now():%H:%M:%S}] {message}\n")
        self.log.see(tk.END)
        self.log.config(state=tk.DISABLED)
