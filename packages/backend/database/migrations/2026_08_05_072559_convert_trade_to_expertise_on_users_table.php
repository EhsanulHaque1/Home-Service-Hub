<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('expertise')->nullable()->after('trade');
        });

        // A worker could only have one trade before; carry it over as a one-item list.
        DB::table('users')
            ->whereNotNull('trade')
            ->where('trade', '!=', '')
            ->get(['id', 'trade'])
            ->each(function ($row) {
                DB::table('users')->where('id', $row->id)->update([
                    'expertise' => json_encode([$row->trade]),
                ]);
            });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('trade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('trade')->nullable()->after('location');
        });

        DB::table('users')
            ->whereNotNull('expertise')
            ->get(['id', 'expertise'])
            ->each(function ($row) {
                $expertise = json_decode($row->expertise, true) ?: [];
                DB::table('users')->where('id', $row->id)->update([
                    'trade' => $expertise[0] ?? null,
                ]);
            });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('expertise');
        });
    }
};
