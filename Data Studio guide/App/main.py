import tkinter as tk
from gui import AppInterface


def main():
    root = tk.Tk()
    AppInterface(root)
    root.mainloop()


if __name__ == "__main__":
    main()
