<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\FoxloggerService;
use App\Models\GpsTelemetryLog;

class SyncDailyGpsLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'gps:sync-daily {--date= : Specific date to sync (YYYY-MM-DD), defaults to today} {--days=1 : Number of past days to sync}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Archive GPS telemetry history from Foxlogger API into local database to prevent data expiration';

    /**
     * Execute the console command.
     */
    public function handle(FoxloggerService $foxlogger): int
    {
        $targetDate = $this->option('date') ?? date('Y-m-d');
        $daysCount = (int) ($this->option('days') ?? 1);

        $this->info("Starting GPS Archive Sync for {$daysCount} day(s) up to {$targetDate}...");

        // Known active truck devices
        $trucks = [
            ['imei' => '0356153590691330', 'plate' => 'B 9731 JXS', 'name' => 'Truk LED 01'],
            ['imei' => '0866833070213829', 'plate' => 'B 9729 JXS', 'name' => 'Truk LED 02'],
        ];

        // 1. Sync & Archive current live report-position snapshot (contains real-time mileage & position)
        $this->info("Archiving current live positions & odometers (report-position)...");
        $livePositions = $foxlogger->getReportPosition(true);
        $posCount = 0;
        foreach ($livePositions as $pos) {
            if (!empty($pos['imei']) && !empty($pos['last_upd'])) {
                $saved = GpsTelemetryLog::bulkSyncFromFoxlogger($pos['imei'], [$pos], $pos['unit'] ?? null);
                $posCount += $saved;
            }
        }
        $this->info("Live position sync done ({$posCount} positions updated).");

        for ($d = 0; $d < $daysCount; $d++) {
            $curDate = date('Y-m-d', strtotime("{$targetDate} -{$d} days"));
            $this->line("\n[Processing Date: {$curDate}]");

            foreach ($trucks as $truck) {
                $this->output->write(" -> Syncing {$truck['name']} ({$truck['plate']} - {$truck['imei']})... ");
                
                // Force refresh to pull directly from Foxlogger API (bypassing local cache/checks)
                $history = $foxlogger->getGpsHistory($truck['imei'], $curDate, true);
                $count = count($history);

                if ($count > 0) {
                    $saved = GpsTelemetryLog::bulkSyncFromFoxlogger($truck['imei'], $history, $truck['plate']);
                    $this->info("SUCCESS: {$saved}/{$count} checkpoints archived.");
                } else {
                    $this->warn("No movement records found for this date.");
                }
            }
        }

        $this->info("\nAll GPS Archiving completed successfully!");
        return Command::SUCCESS;
    }
}
