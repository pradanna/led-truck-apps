<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\HolowitsService;
use App\Models\AiTrafficDailyLog;

class SyncDailyAiTraffic extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'traffic:sync-daily {--date= : Specific date to sync (YYYY-MM-DD), defaults to today}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Archive AI Traffic analytics from NVRs into local database to prevent data expiration';

    /**
     * Execute the console command.
     */
    public function handle(HolowitsService $holowits): int
    {
        $targetDate = $this->option('date') ?? date('Y-m-d');
        $this->info("Archiving AI Traffic Analytics for date: {$targetDate}...");

        $liveData = $holowits->getLiveMonitoringData();
        $trucks = $liveData['trucks'] ?? [];

        foreach ($trucks as $truckId => $tData) {
            $traffic = $tData['traffic'] ?? [];
            $plate = $tData['plate'] ?? ($truckId === 'truck_2' ? 'B 9729 JXS' : 'B 9731 JXS');
            $name = $tData['name'] ?? $truckId;

            $record = AiTrafficDailyLog::recordTraffic($truckId, $targetDate, $traffic, $plate);
            if ($record) {
                $this->info(" -> [{$name} ({$plate})]: Archived {$record->total_traffic} vehicles/pedestrians (Reach: {$record->estimated_reach}).");
            } else {
                $this->comment(" -> [{$name} ({$plate})]: Kamera standby / offline (Data tidak disimpan ke database).");
            }
        }

        $this->info("AI Traffic archiving completed successfully!");
        return Command::SUCCESS;
    }
}
