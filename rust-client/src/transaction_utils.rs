use regex::Regex;
use solana_sdk::pubkey::Pubkey;

pub fn parse_event_log<
    T: anchor_lang::AnchorDeserialize + anchor_lang::AnchorSerialize + anchor_lang::Discriminator,
>(
    logs: &[String],
    program_id: Pubkey,
) -> Option<T> {
    let program_start_pattern = Regex::new(r"Program .* invoke \[\d{1}\]").ok()?;
    let program_end_pattern = Regex::new(r"Program .* success").ok()?;
    let mut execution_stack: Vec<String> = vec![];
    for log in logs.iter() {
        if program_start_pattern.is_match(log) {
            let parsed_program_id: String = log.chars().skip(8).take(44).collect();
            let parsed_program_id = parsed_program_id.trim();
            execution_stack.push(parsed_program_id.to_string());
        }
        if program_end_pattern.is_match(log) {
            execution_stack.pop();
        }
        if log.starts_with("Program data:") && *execution_stack.last()? == program_id.to_string() {
            // Skip the prefix "Program data: "
            // Event logged has been changed to Program data: instead of Program log:
            // https://github.com/project-serum/anchor/pull/1608/files
            let log_info: String = log.chars().skip(14).collect();
            let log_buf = anchor_lang::__private::base64::decode(log_info.as_bytes());
            if log_buf.is_ok() {
                let log_buf = log_buf.ok()?;
                // Check for event discriminator, it is a 8-byte prefix
                if log_buf[0..8] == T::discriminator() {
                    // Skip event discriminator when deserialize
                    return T::try_from_slice(&log_buf[8..]).ok();
                }
            }
        }
    }
    None
}
