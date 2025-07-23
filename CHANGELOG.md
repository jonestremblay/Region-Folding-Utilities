# Change Log

All notable changes to the "region-folding-utilities" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Releases]

- v.1.0.0 Initial release
    - **🔄 Fold & Sync All Regions**: Automatically updates line count in all regions and folds them
    - **➕ Sync Line Count into Region Markers**: Adds or updates line count in region markers
    - **📂 Unfold All Regions**: Unfolds all regions in the file
    - **🖱️ Context menu**: Quick access to all commands via right-click

- v.1.0.1 QoL changes
    - Now works with every filetype that has a comment syntax. No more constraint of using it only in .sql files.
        - To works, you need to use the syntax for a line comment in your filetype. IE : In Java, you would use '//'
        - TEXT (.txt) files don't have a syntax for comments, thus is not supported.
    - Improved information messages
    - The count of total lines that were folded are now shown to the user.
        - For all actions ; Fold & Sync All Regions, Unfold All Regions and Sync Line Count into Region Markers


- v1.0.2 Dropped requirements
    - Changed the required version of VSCode to a older version (1.85.0), for maximum support of a maximum users.
    - Updated the README.md files about it.