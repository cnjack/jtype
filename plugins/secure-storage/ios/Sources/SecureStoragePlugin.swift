import Security
import Tauri
import WebKit

private class SecretKeyArgs: Decodable {
  let key: String
}

private class SecretValueArgs: Decodable {
  let key: String
  let value: String
}

class SecureStoragePlugin: Plugin {
  private let service = "net.jcode.jtype.secure-storage"

  @objc public func getSecret(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(SecretKeyArgs.self)
    var query = baseQuery(key: args.key)
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    if status == errSecItemNotFound {
      invoke.resolve(["value": NSNull()])
      return
    }
    guard status == errSecSuccess,
          let data = result as? Data,
          let value = String(data: data, encoding: .utf8) else {
      invoke.reject(errorMessage(operation: "read", status: status))
      return
    }
    invoke.resolve(["value": value])
  }

  @objc public func setSecret(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(SecretValueArgs.self)
    let data = Data(args.value.utf8)
    let query = baseQuery(key: args.key)
    let updateStatus = SecItemUpdate(
      query as CFDictionary,
      [kSecValueData as String: data] as CFDictionary
    )
    if updateStatus == errSecItemNotFound {
      var insert = query
      insert[kSecValueData as String] = data
      insert[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
      let addStatus = SecItemAdd(insert as CFDictionary, nil)
      guard addStatus == errSecSuccess else {
        invoke.reject(errorMessage(operation: "store", status: addStatus))
        return
      }
    } else if updateStatus != errSecSuccess {
      invoke.reject(errorMessage(operation: "store", status: updateStatus))
      return
    }
    invoke.resolve(["value": args.value])
  }

  @objc public func deleteSecret(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(SecretKeyArgs.self)
    let status = SecItemDelete(baseQuery(key: args.key) as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else {
      invoke.reject(errorMessage(operation: "delete", status: status))
      return
    }
    invoke.resolve(["value": NSNull()])
  }

  private func baseQuery(key: String) -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key,
    ]
  }

  private func errorMessage(operation: String, status: OSStatus) -> String {
    let detail = SecCopyErrorMessageString(status, nil) as String? ?? "OSStatus \(status)"
    return "Unable to \(operation) secure value: \(detail)"
  }
}

@_cdecl("init_plugin_secure_storage")
func initPlugin() -> Plugin {
  SecureStoragePlugin()
}
