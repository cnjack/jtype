// swift-tools-version:5.3

import PackageDescription

let package = Package(
    name: "tauri-plugin-mobile-interaction",
    platforms: [
        .macOS(.v10_13),
        .iOS(.v13),
    ],
    products: [
        .library(
            name: "tauri-plugin-mobile-interaction",
            type: .static,
            targets: ["tauri-plugin-mobile-interaction"]),
    ],
    dependencies: [
        .package(name: "Tauri", path: "../.tauri/tauri-api")
    ],
    targets: [
        .target(
            name: "tauri-plugin-mobile-interaction",
            dependencies: [
                .byName(name: "Tauri")
            ],
            path: "Sources")
    ]
)
