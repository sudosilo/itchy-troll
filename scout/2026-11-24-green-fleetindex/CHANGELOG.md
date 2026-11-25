Fleet Index changelog

2026-11-24, v2026.11.24. Created the fleet index server for FileCensus. Phones push their file inventories to it, and any phone can ask which phone holds a given file. It keeps a searchable copy in memory and saves the data to a database. It refuses every request until an access key is set.
