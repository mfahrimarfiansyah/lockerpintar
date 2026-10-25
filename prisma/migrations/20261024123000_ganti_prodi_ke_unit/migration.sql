-- Istilah umum (tidak khusus kampus): "prodi" menjadi "unit" (divisi/kelas/prodi).
-- Diganti nama, bukan dihapus, sehingga data yang ada tetap utuh.
ALTER TABLE "Peminjam" RENAME COLUMN "prodi" TO "unit";
