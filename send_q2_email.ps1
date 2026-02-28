# 1. Take Screenshot
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.width, $bounds.height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.size)

$filepath = "c:\Users\suoya\OneDrive\Documents\nexttech\DriveMCP\custom_mcp_screenshot.png"
$bitmap.Save($filepath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

Write-Host "Screenshot captured successfully for Câu 2!"

# 2. Build email and send with attachment
$token = "<YOUR_GMAIL_ACCESS_TOKEN>"
$headers = @{ "Authorization" = "Bearer $token" }

$fileBytes = [System.IO.File]::ReadAllBytes($filepath)
$fileBase64 = [Convert]::ToBase64String($fileBytes)

$boundary = "----=_NextPart_" + [guid]::NewGuid().ToString().Replace("-", "")
$replyBody = "Chào bạn,`r`n`r`nĐây là thông tin từ Câu 2 - Custom MCP Server:`r`n`r`n- Source code: https://github.com/LeeNim/DriveMCP-Anti`r`n- Giải thích: Tôi chọn xây dựng Google Drive MCP Server vì quá trình tham nhiệm vụ yêu cầu khả năng đọc, tìm kiếm các file dữ liệu lớn. Hiện tại Antigravity chưa có Drive MCP native nên việc có thêm server này sẽ tăng cường triệt để khả năng truy xuất document của agent từ Drive của người dùng.`r`n`r`n(Đính kèm là screenshot kết nối thành công trả về Pong từ công cụ drive_ping).`r`n`r`nTrân trọng,"

$targetSubj = "Re: [TechNext Asia] Bài đánh giá năng lực — AI Intern"
$targetMsgId = "<19c9d09367f1ad4d>"

$mailHeaders = "To: nathan@technext.asia`r`n"
$mailHeaders += "Subject: $targetSubj`r`n"
$mailHeaders += "In-Reply-To: $targetMsgId`r`n"
$mailHeaders += "References: $targetMsgId`r`n"
$mailHeaders += "MIME-Version: 1.0`r`n"
$mailHeaders += "Content-Type: multipart/mixed; boundary=`"$boundary`"`r`n`r`n"

$bodyPart = "--$boundary`r`n"
$bodyPart += "Content-Type: text/plain; charset=`"UTF-8`"`r`n"
$bodyPart += "Content-Transfer-Encoding: 8bit`r`n`r`n"
$bodyPart += "$replyBody`r`n`r`n"

$attachPart = "--$boundary`r`n"
$attachPart += "Content-Type: image/png; name=`"custom_mcp_screenshot.png`"`r`n"
$attachPart += "Content-Disposition: attachment; filename=`"custom_mcp_screenshot.png`"`r`n"
$attachPart += "Content-Transfer-Encoding: base64`r`n`r`n"
$attachPart += ($fileBase64 -replace '(.{76})', "`$1`r`n") + "`r`n`r`n"
$attachPart += "--$boundary--`r`n"

$rawMessage = $mailHeaders + $bodyPart + $attachPart
$rawMessageBytes = [System.Text.Encoding]::UTF8.GetBytes($rawMessage)
$rawMessageBase64Url = [Convert]::ToBase64String($rawMessageBytes).Replace('+', '-').Replace('/', '_').Replace('=', '')

$sendBody = @{
    raw      = $rawMessageBase64Url
    threadId = "19c9d09367f1ad4d"
} | ConvertTo-Json

$sendUri = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
# Invoke-RestMethod -Uri $sendUri -Method Post -Headers (@{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }) -Body $sendBody

Write-Host "Script generated and ready to send via '$sendUri'. Please review the script."
