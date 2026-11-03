use solana_sdk::signer::keypair::Keypair;
use std::collections::BTreeMap;
use std::fs::File;
use std::io::BufReader;
use std::io::Read;
use std::io::Write;
use std::path::PathBuf;

pub fn read_keypair(path: PathBuf) -> Result<Keypair, &'static str> {
    let file = File::open(path).unwrap();
    let mut reader = BufReader::new(file);
    let mut buf = String::new();
    if reader.read_to_string(&mut buf).is_ok() {
        let keypair = Keypair::from_base58_string(&buf);
        return Ok(keypair);
    }
    Err("Cannot read keypair")
}

pub fn parse_send_signature(path: &PathBuf) -> anyhow::Result<BTreeMap<String, String>> {
    let mut file = File::open(path)?;
    let mut data = String::new();
    file.read_to_string(&mut data).unwrap();
    let hashmap = serde_json::from_str(&data)?;
    Ok(hashmap)
}

pub fn write_signature_to_file(signatures: BTreeMap<String, String>, path: &PathBuf) {
    let serialized = serde_json::to_string_pretty(&signatures).unwrap();
    let mut file: File = File::create(path).unwrap();
    file.write_all(serialized.as_bytes()).unwrap();
}
